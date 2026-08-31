/**
 * @module
 * Response interceptor for the refresh-and-retry flow: on a 401 (outside the excluded auth
 * endpoints), renews the token once and replays the original request exactly once.
 */

import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { instance } from './client.ts';
import { getTokenFromResponse } from './envelope.ts';
import { onResponseReject } from './interceptors.ts';
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
    '/account/logout-all'
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
    const { setAccessToken } = useSessionStore();
    const originalRequest = error.config as AxiosRequestConfigWithRetry | undefined;
    // `_dontRetry` is the loop guard: a 401 on the refresh call itself must not trigger a refresh.
    if (
        error.response?.status === 401 &&
        !originalRequest?._dontRetry &&
        !shouldSkipRefresh(originalRequest?.url)
    )
        return instance
            .get<ResponseSuccess<{ token: string }>>('/account/refresh', {
                _dontRetry: true
            } as AxiosRequestConfigWithRetry)
            .then(({ data }) => {
                const token = getTokenFromResponse(data);
                // A 200 carrying no token is a failed refresh.
                if (!token || !originalRequest) return onResponseReject(error);
                // Store first, then replay: the interceptor reads the token off the store.
                setAccessToken(token);
                return instance.request({
                    ...originalRequest,
                    _dontRetry: true
                } as AxiosRequestConfigWithRetry);
            })
            .catch(() => onResponseReject(error));
    return onResponseReject(error);
};
