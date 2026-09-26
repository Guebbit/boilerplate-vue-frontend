/**
 * @module
 * Response interceptor for the refresh-and-retry flow: on a 401 (outside the excluded auth
 * endpoints), renews the token once and replays the original request exactly once.
 *
 * The refresh attempt itself belongs to `infrastructure/session.ts`'s `refreshToken` — single
 * flight, epoch-guarded against a stale result landing after a `clearSession`, and the one place
 * that ends the session outright on a definitive 401/403 from the refresh endpoint. This module
 * only decides WHEN to call it and what to do with what it returns.
 */

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
 * Endpoints that must never trigger the refresh-and-retry flow: a 401 there is a genuine
 * credential failure, not an expired token.
 */
const REFRESH_EXCLUDED_PATHS = new Set([
    '/account/login',
    '/account/signup',
    '/account/reset',
    '/account/reset-confirm',
    // A wrong or expired 2FA code answers 401 like any other business outcome. Without this, a
    // visitor who still holds a valid refresh cookie from an earlier session gets a silent
    // refresh-and-replay instead of "wrong code".
    '/account/login/2fa',
    '/account/login/2fa/send'
]);

/**
 * Tells whether a failed request should skip the token refresh flow.
 *
 * @param url - Request URL, absolute or relative.
 * @returns `true` when the URL's pathname is one of {@link REFRESH_EXCLUDED_PATHS}.
 */
const shouldSkipRefresh = (url?: string) => {
    if (!url) return false;
    return REFRESH_EXCLUDED_PATHS.has(toPathname(url));
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
    const { refreshToken } = useSessionStore();
    const originalRequest = error.config as AxiosRequestConfigWithRetry | undefined;
    // `_refreshed` is the loop guard: a 401 on the refresh call itself, or on a request already
    // replayed once, must not trigger another refresh. It does NOT also block a step-up —
    // that branch has its own `_steppedUp` guard, so a request may be refreshed once and stepped
    // up once, which is exactly the case an access token that expired between refreshes needs.
    if (
        error.response?.status === 401 &&
        !originalRequest?._refreshed &&
        !shouldSkipRefresh(originalRequest?.url)
    )
        return refreshToken().then((token) => {
            // A failed or tokenless refresh is a failed refresh. `refreshToken` already stored it
            // (or didn't, on a stale/failed attempt) — this interceptor only decides the replay.
            if (!token || !originalRequest) return onResponseReject(error);
            return instance.request({
                ...originalRequest,
                _refreshed: true
            } as AxiosRequestConfigWithRetry);
        });
    return onResponseReject(error);
};
