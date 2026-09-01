/**
 * @module
 * Pinia store for the token/viewer pair that gates the app: an in-memory access token plus a
 * minimal projection of who holds it. `isAuth`/`isAdmin` derive from both together, never either
 * alone, so a restored-but-not-yet-identified session cannot be read as authenticated.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { getCookie } from '@guebbit/js-toolkit';
import {
    getAccount as apiGetAccount,
    refreshToken as apiRefreshToken,
    logout as apiLogout,
    logoutAll as apiLogoutAll,
    updateAccount as apiUpdateAccount
} from '@api';
import { getTokenFromResponse, getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';

/**
 * The visitor's session: a token, and the least the app must know about whoever holds it.
 *
 * Deliberately a minimal projection — `{ id, email, admin }` — rather than the domain `User`,
 * which lives in `src/modules/account`. See `docs/theory/layers.md` for the split and for which
 * `/account` calls belong here.
 */

/**
 * The least the app shell and the guards need to know about the signed-in visitor.
 */
export interface SessionViewer {
    id: string;
    email: string;
    admin: boolean;
    /**
     * The visitor's own picture, for the avatar the account menu wears — the shell renders it on
     * every page, so it is one of the few user fields the shell genuinely needs rather than one
     * the account module could keep to itself.
     */
    imageUrl?: string;
    /**
     * The small variant of {@link imageUrl}, shown as the avatar's first-paint tier. Absent for a
     * remote/default image or while a digest job is still pending.
     */
    thumbnailUrl?: string;
}

/**
 * Writes a cookie through the prototype setter rather than `document.cookie`.
 *
 * Going through the original descriptor keeps the write working even when a library (or a test
 * double) has shadowed `document.cookie` on the instance.
 *
 * @param value - Full cookie string, attributes included.
 */
const setCookie = (value: string) => {
    const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    cookieDescriptor?.set?.call(document, value);
};

/**
 * Store instance: see the module doc above for the `isAuth`/`isAdmin` derivation rule.
 */
export const useSessionStore = defineStore('session', () => {
    /**
     * User access token. In memory only — the refresh token is an httpOnly cookie the browser
     * never exposes, which is what makes a stolen bundle useless.
     */
    const accessToken = ref<string>();

    /**
     * The signed-in visitor, as much of them as the shell and the guards are entitled to.
     */
    const viewer = ref<SessionViewer>();

    /**
     * Both derive from token AND viewer, not either alone: a token with no viewer is a session
     * that has been restored but not yet identified, and treating it as authenticated lets a
     * guard admit someone whose role is still unknown.
     */
    const isAuth = computed(() => Boolean(accessToken.value && viewer.value));
    const isAdmin = computed(() => Boolean(accessToken.value && viewer.value?.admin));

    /**
     * Thirty days — what "remember me" conventionally promises. Also stamped onto the durable
     * `rememberMe` marker, so a later silent refresh (which does not know the original choice)
     * can tell the two cases apart. See `useAuthStore.login`'s `remember` param.
     */
    const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

    /**
     * Records a freshly issued token and flags the JS-readable `isAuth` cookie.
     *
     * The cookie is not the credential — it is the hint that lets `tryRestoreAuth` skip a
     * pointless refresh round-trip for a visitor who was never signed in. Its own lifetime
     * mirrors the `rememberMe` marker rather than defaulting to session-only: otherwise a
     * "remember me" visitor's httpOnly refresh cookie would outlive the JS-readable hint that
     * tells the app to even try it, silently dropping the remembered session at browser restart.
     *
     * @param token - Access token from a login or refresh response.
     * @param remember - Whether to (re)start the 30-day `rememberMe` marker. `true`/`false` at
     *  login, when the caller knows the visitor's choice; omitted on a silent refresh, which
     *  reads whatever marker login left rather than guessing.
     */
    const setAccessToken = (token?: string, remember?: boolean) => {
        accessToken.value = token;
        if (remember !== undefined)
            setCookie(
                remember
                    ? `rememberMe=true; path=/; max-age=${REMEMBER_ME_MAX_AGE_SECONDS}; SameSite=Lax`
                    : 'rememberMe=; path=/; max-age=0; SameSite=Lax'
            );
        if (!token) return;
        const remembered = remember ?? Boolean(getCookie('rememberMe'));
        setCookie(
            remembered
                ? `isAuth=true; path=/; max-age=${REMEMBER_ME_MAX_AGE_SECONDS}; SameSite=Lax`
                : 'isAuth=true; path=/; SameSite=Lax'
        );
    };

    /**
     * Records who the token belongs to.
     *
     * @param nextViewer - The claims projection, or `undefined` to forget it.
     */
    const setViewer = (nextViewer?: SessionViewer) => {
        viewer.value = nextViewer;
    };

    /**
     * Renews the in-memory access token using the httpOnly refresh cookie.
     *
     * @returns A promise resolving once the new token is stored.
     */
    const refreshToken = () =>
        apiRefreshToken().then((data) => {
            setAccessToken(getTokenFromResponse(data));
        });

    /**
     * Asks the API who the current token belongs to and stores the projection.
     *
     * @returns A promise resolving once `viewer` reflects the response.
     */
    const loadViewer = () =>
        apiGetAccount().then((data) => {
            // Typed structurally rather than as the generated `User`: naming the domain entity
            // here would put a `User` back into `infrastructure`.
            const payload = getPayloadFromResponse<{
                id: string;
                email: string;
                admin?: boolean;
                imageUrl?: string;
                thumbnailUrl?: string;
            }>(data);
            setViewer(
                payload && {
                    id: payload.id,
                    email: payload.email,
                    admin: Boolean(payload.admin),
                    imageUrl: payload.imageUrl,
                    thumbnailUrl: payload.thumbnailUrl
                }
            );
            return payload;
        });

    /**
     * Remembers a signed-in visitor's language choice on their account.
     *
     * A guest's choice lives in the URL (`/:locale/...`) and dies with the tab, which is the right
     * lifetime for someone with no record to write to; a signed-in visitor's account record is the
     * one place a preference outlives the tab.
     *
     * The `isAuth` check is here rather than at the call site because it is a rule about the
     * preference, not about the button — a caller that forgot it would send an anonymous
     * `PUT /account` and get a 401. It is also what keeps `AppLanguageSwitcher` out of this store.
     *
     * Best-effort: callers fire it without awaiting, and a failed write is invisible, leaving the
     * stored preference stale until the next switch. A toast about a preference nobody asked to be
     * told about is the worse trade.
     *
     * @param locale - Language tag the visitor just chose.
     * @returns Resolves once the write settles, or immediately for a guest. Never rejects.
     */
    const persistLocalePreference = (locale: string): Promise<void> =>
        isAuth.value
            ? apiUpdateAccount({ locale })
                  .then(() => undefined)
                  .catch(() => undefined)
            : Promise.resolve();

    /**
     * Drops every trace of the session held here: token, viewer and the `isAuth` cookie.
     *
     * Domain caches are NOT cleared from here — the account module resets its own on logout.
     *
     * @returns Nothing; state is cleared as a side effect.
     */
    const clearSession = () => {
        accessToken.value = undefined;
        viewer.value = undefined;
        // The httpOnly jwt cookie can only be cleared server-side; isAuth/rememberMe are JS-accessible.
        setCookie('isAuth=; path=/; max-age=0; SameSite=Lax');
        setCookie('rememberMe=; path=/; max-age=0; SameSite=Lax');
    };

    /**
     * Ends THIS session only: the refresh cookie's token is revoked server-side and local state is
     * cleared. Other devices keep their own tokens — `logoutAll` is the one that ends everything.
     *
     * @returns A promise resolving once the API call succeeds and local state is cleared.
     */
    const logout = () => apiLogout().then(() => clearSession());

    /**
     * Ends every session for this visitor, server-side and locally.
     *
     * @returns A promise resolving once the API call succeeds and local state is cleared.
     */
    const logoutAll = () => apiLogoutAll().then(() => clearSession());

    return {
        accessToken,
        viewer,
        isAuth,
        isAdmin,
        setAccessToken,
        setViewer,
        refreshToken,
        loadViewer,
        persistLocalePreference,
        clearSession,
        logout,
        logoutAll
    };
});
