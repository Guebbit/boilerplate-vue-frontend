import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
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

/** The least the app shell and the guards need to know about the signed-in visitor. */
export interface SessionViewer {
    id: string;
    email: string;
    admin: boolean;
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

export const useSessionStore = defineStore('session', () => {
    /**
     * User access token. In memory only — the refresh token is an httpOnly cookie the browser
     * never exposes, which is what makes a stolen bundle useless.
     */
    const accessToken = ref<string>();

    /** The signed-in visitor, as much of them as the shell and the guards are entitled to. */
    const viewer = ref<SessionViewer>();

    /**
     * Both derive from token AND viewer, not either alone: a token with no viewer is a session
     * that has been restored but not yet identified, and treating it as authenticated lets a
     * guard admit someone whose role is still unknown.
     */
    const isAuth = computed(() => Boolean(accessToken.value && viewer.value));
    const isAdmin = computed(() => Boolean(accessToken.value && viewer.value?.admin));

    /**
     * Records a freshly issued token and flags the JS-readable `isAuth` cookie.
     *
     * The cookie is not the credential — it is the hint that lets `tryRestoreAuth` skip a
     * pointless refresh round-trip for a visitor who was never signed in.
     *
     * @param token - Access token from a login or refresh response.
     */
    const setAccessToken = (token?: string) => {
        accessToken.value = token;
        if (token) setCookie('isAuth=true; path=/; SameSite=Lax');
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
            }>(data);
            setViewer(
                payload && { id: payload.id, email: payload.email, admin: Boolean(payload.admin) }
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
        // The httpOnly jwt cookie can only be cleared server-side; isAuth is JS-accessible.
        setCookie('isAuth=; path=/; max-age=0; SameSite=Lax');
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
