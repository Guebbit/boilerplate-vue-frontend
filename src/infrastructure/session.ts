import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import {
    getAccount as apiGetAccount,
    refreshToken as apiRefreshToken,
    logout as apiLogout,
    logoutAll as apiLogoutAll
} from '@api';

/**
 * The visitor's session: a token, and the least the app must know about whoever holds it.
 *
 * ── Why this is separate from the account module ─────────────────────────────────────────────
 * `infrastructure/http` has to read the access token on every request, and the router guards have to know
 * `isAuth` / `isAdmin` before any domain code runs. Both are the bottom of the stack. The *user
 * record* — the editable `User`, its email, its avatar, the endpoints that change it — is domain
 * knowledge and lives in `src/modules/account`.
 *
 * Holding both in one store would give `infrastructure` a `User` entity and make the app shell
 * reach into a domain to render a name. This holds a deliberately minimal projection instead:
 *
 *     viewer = { id, email, admin }
 *
 * The shell knows *someone is signed in, here is their display name, they are staff*. It does not
 * know what a `User` is, and deleting the account module does not break it.
 *
 * ── Which `/account` calls belong here ───────────────────────────────────────────────────────
 * The three the session needs to restore or end **itself**: `GET /account` (who am I),
 * `/account/refresh`, `/account/logout-all`. Everything else under `/account` — signup, the
 * password resets, the deletion flow, editing your own record — is an operation *on* an account
 * rather than *on* the session, and belongs to the module.
 *
 * A visitor's language preference is likewise the module's: this store never writes it.
 */

/** The least the app shell and the guards need to know about the signed-in visitor. */
export interface SessionViewer {
    id: string;
    email: string;
    admin: boolean;
}

/**
 * Narrows any value to a plain keyed object.
 *
 * @param value - Value to test.
 * @returns `true` when `value` is a non-null object.
 */
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * Detects the `{ data }` envelope the API wraps most payloads in.
 *
 * @param response - Raw API response.
 * @returns `true` when the value carries a `data` property.
 */
const isWrappedResponse = <T>(response: unknown): response is { data?: T } =>
    isObjectRecord(response) && 'data' in response;

/**
 * Reads the access token out of a login or refresh response, wrapped or not.
 *
 * @param response - Raw API response.
 * @returns The token, or `undefined` when the response carries none.
 */
export const getTokenFromResponse = (response?: unknown): string | undefined => {
    // Top level first: login answers with a bare `{ token }`, refresh wraps it in an envelope.
    if (isObjectRecord(response)) {
        const maybeToken = (response as Record<string, unknown>).token;
        if (typeof maybeToken === 'string') return maybeToken;
    }
    if (isWrappedResponse<{ token?: string }>(response)) return response.data?.token;
    return undefined;
};

/**
 * Extracts the payload from both wrapped (`{ data }`) and direct responses.
 *
 * @typeParam T - Expected payload type.
 * @param response - Raw API response.
 * @returns The unwrapped payload, or `undefined` when absent.
 */
export const getPayloadFromResponse = <T>(response?: { data?: T } | T): T | undefined =>
    isWrappedResponse<T>(response) ? response.data : (response as T | undefined);

/**
 * Writes a cookie through the prototype setter rather than `document.cookie`.
 *
 * Going through the original descriptor keeps the write working even when a
 * library (or a test double) has shadowed `document.cookie` on the instance.
 *
 * @param value - Full cookie string, attributes included, e.g.
 *  `isAuth=true; path=/; SameSite=Lax`.
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
     * The cookie is not the credential — it is the hint that lets `tryRestoreAuth` skip a pointless
     * refresh round-trip for a visitor who was never signed in.
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
     * `GET /account` is the session's own "who am I", which is why it is here and not in the
     * account module: restoring a session on a page reload must not require a domain to be enabled.
     *
     * @returns A promise resolving once `viewer` reflects the response.
     */
    const loadViewer = () =>
        apiGetAccount().then((data) => {
            /*
             * Typed structurally rather than as the generated `User`. What this store needs from
             * the whoami response is three fields; naming the domain entity here would put a
             * `User` back into `infrastructure`, which is the thing the split removed.
             */
            const payload = getPayloadFromResponse<{
                id: string;
                email: string;
                admin?: boolean;
            }>(data as { data?: { id: string; email: string; admin?: boolean } });
            setViewer(
                payload && { id: payload.id, email: payload.email, admin: Boolean(payload.admin) }
            );
            return payload;
        });

    /**
     * Drops every trace of the session held here: token, viewer and the `isAuth` cookie.
     *
     * Domain caches are NOT cleared from here — the account module resets its own on logout. A
     * core store reaching into a module's cache is the coupling this split removed.
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
     * Ends THIS session only: the refresh cookie's token is revoked server-side and local state
     * is cleared. Other devices keep their own tokens and stay signed in — `logoutAll` is the
     * one that ends everything, and the profile page offers both.
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
        clearSession,
        logout,
        logoutAll
    };
});
