/**
 * @module
 * Response interceptor for the refresh-and-retry flow: on a 401 (outside the excluded auth
 * endpoints), renews the token once and replays the original request exactly once.
 *
 * In `cookie` mode there is nothing to renew (`POST /account/refresh` is a 404 there): a 401 means
 * the session cookie is gone, so the session ends at once and the request is not replayed.
 *
 * The refresh attempt itself belongs to `infrastructure/session.ts`'s `refreshToken` — single
 * flight, epoch-guarded against a stale result landing after a `clearSession`, and the one place
 * that ends the session outright on a definitive 401/403 from the refresh endpoint. This module
 * only decides WHEN to call it and what to do with what it returns.
 */

import { ERROR_CODES } from '@api/error-codes';
import { ROUTES } from '@api/routes';
import { useSessionStore } from '@/infrastructure/session.ts';
import { instance } from './client.ts';
import { onResponseReject } from './interceptors.ts';
import { toPathname } from './url.ts';
import type { AxiosError } from 'axios';
import type {
    AxiosRequestConfigWithRetry,
    AxiosResponseErrorBody,
    AxiosResponseErrorData
} from './types.ts';

/**
 * Operations that must never trigger the refresh-and-retry flow: a 401 there is a genuine
 * credential failure, not an expired token. The contract marks them (`x-no-refresh`).
 */
const NO_REFRESH_ROUTES = ROUTES.filter((route) => route.noRefresh);

/**
 * Tells whether a failed request should skip the token refresh flow.
 *
 * @param url - Request URL, absolute or relative.
 * @param method - Request method; the route table is keyed on it as well.
 * @returns `true` when the request is one of {@link NO_REFRESH_ROUTES}.
 */
const shouldSkipRefresh = (url?: string, method = 'get') => {
    if (!url) return false;
    const pathname = toPathname(url);
    return NO_REFRESH_ROUTES.some(
        (route) => route.method === method.toUpperCase() && route.pattern.test(pathname)
    );
};

/**
 * Whether a request is `GET /account` — the read that carries the abilities, so a 403 on it must
 * not trigger another one.
 *
 * @param request - The failed request's config.
 */
const isAccountRead = (request?: AxiosRequestConfigWithRetry): boolean =>
    request?.method?.toLowerCase() === 'get' && toPathname(request.url ?? '') === '/account';

/**
 * Whether a 401 says the session ended for inactivity — the server's `SESSION_IDLE`.
 *
 * @param error - The failed request.
 */
const isIdleRefusal = (
    error: AxiosError<AxiosResponseErrorData, AxiosResponseErrorBody>
): boolean =>
    error.response?.status === 401 &&
    (error.response.data as { errors?: { code?: string }[] } | undefined)?.errors?.[0]?.code ===
        ERROR_CODES.SESSION_IDLE;

/**
 * A 401 in `cookie` mode: the cookie no longer names a live session. A visitor who held one is
 * told it expired; a guest's 401 is just a refusal.
 *
 * @param error - The 401 that triggered the interceptor.
 * @returns The normalized rejection from {@link onResponseReject}.
 */
const endCookieSession = (error: AxiosError<AxiosResponseErrorData, AxiosResponseErrorBody>) => {
    const session = useSessionStore();
    if (session.hasSession) session.signalExpired();
    return onResponseReject(error);
};

/**
 * Response error interceptor with refresh support: on a 401, renew the token and replay the
 * request once.
 *
 * @param error - Axios error that triggered the interceptor.
 * @returns The replayed request's response when the refresh succeeds, otherwise the normalized
 *  rejection from {@link onResponseReject}.
 */
export const onResponseRejectWithRefresh = (
    error: AxiosError<AxiosResponseErrorData, AxiosResponseErrorBody>
) => {
    const session = useSessionStore();
    const originalRequest = error.config as AxiosRequestConfigWithRetry | undefined;
    // A staff session that sat idle too long: refreshing would only mint a token for a session the
    // server has already ended, so say why and stop.
    if (isIdleRefusal(error)) {
        session.signalIdle();
        return onResponseReject(error);
    }
    // `_refreshed` is the loop guard: a 401 on the refresh call itself, or on a request already
    // replayed once, must not trigger another refresh. It does NOT also block a step-up —
    // that branch has its own `_steppedUp` guard, so a request may be refreshed once and stepped
    // up once, which is exactly the case an access token that expired between refreshes needs.
    if (
        error.response?.status === 401 &&
        !originalRequest?._refreshed &&
        !shouldSkipRefresh(originalRequest?.url, originalRequest?.method)
    ) {
        if (session.mode === 'cookie') return endCookieSession(error);
        return session.refreshToken().then((token) => {
            // A failed or tokenless refresh is a failed refresh. `refreshToken` already stored it
            // (or didn't, on a stale/failed attempt) — this interceptor only decides the replay.
            if (!token || !originalRequest) return onResponseReject(error);
            return instance.request({
                ...originalRequest,
                _refreshed: true
            } as AxiosRequestConfigWithRetry);
        });
    }
    // A 403 on a signed-in request may mean the rules changed under the session (a role taken
    // away): re-read them (`GET /account` carries them) so the menu and buttons follow. That read
    // itself is excluded, or a refused read would ask again forever.
    if (error.response?.status === 403 && session.isAuth && !isAccountRead(originalRequest))
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- reloadAbilities never rejects (a failed read leaves the empty abilities)
        void session.reloadAbilities();
    return onResponseReject(error);
};
