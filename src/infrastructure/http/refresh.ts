/**
 * @module
 * Response interceptor for the refresh-and-retry flow: on a 401 (outside the excluded auth
 * endpoints), renews the token once and replays the original request exactly once. The refresh
 * call itself is SINGLE-FLIGHT: several requests failing with 401 in the same tick share one
 * `GET /account/refresh` rather than firing one each.
 */

import { useSessionStore } from '@/infrastructure/session.ts';
import { instance } from './client.ts';
import { getTokenFromResponse } from './envelope.ts';
import { onResponseReject } from './interceptors.ts';
import { singleFlight } from './single-flight.ts';
import { toPathname } from './url.ts';
import type { AxiosError } from 'axios';
import type { ResponseSuccess } from '@/types';
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
    '/account/logout-all',
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
 * Renews the access token, single-flight (see `single-flight.ts`): a caller arriving while a
 * refresh is already running gets that SAME promise rather than starting a second
 * `GET /account/refresh` — two 401s in the same tick must not race the refresh cookie against
 * itself.
 *
 * @returns A promise resolving with the fresh token, or `undefined` when the refresh failed or
 *  answered with none.
 */
const refreshAccessToken = singleFlight((): Promise<string | undefined> =>
    instance
        .get<ResponseSuccess<{ token: string }>>('/account/refresh', {
            _dontRetry: true
        } as AxiosRequestConfigWithRetry)
        .then(({ data }) => getTokenFromResponse(data))
        .catch(() => undefined)
);

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
    const { setAccessToken } = useSessionStore();
    const originalRequest = error.config as AxiosRequestConfigWithRetry | undefined;
    // `_dontRetry` is the loop guard: a 401 on the refresh call itself must not trigger a refresh.
    if (
        error.response?.status === 401 &&
        !originalRequest?._dontRetry &&
        !shouldSkipRefresh(originalRequest?.url)
    )
        return refreshAccessToken().then((token) => {
            // A failed or tokenless refresh is a failed refresh.
            if (!token || !originalRequest) return onResponseReject(error);
            // Store first, then replay: the interceptor reads the token off the store.
            setAccessToken(token);
            return instance.request({
                ...originalRequest,
                _dontRetry: true
            } as AxiosRequestConfigWithRetry);
        });
    return onResponseReject(error);
};
