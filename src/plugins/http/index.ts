import axiosClient from 'axios';
import { getCurrentLocale } from '@/utils/i18n.ts';
import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { IResponseReject, IResponseSuccess } from '@/types';
import { useProfileStore } from '@/stores/profile.ts';
import { storeToRefs } from 'pinia';

/**
 * Custom request config for internal retry bookkeeping.
 *
 * `_dontRetry` is optional by design:
 * - normal requests don't need it
 * - refresh/retried requests can set it when needed
 * - keeping it optional avoids forcing unrelated call sites to provide it
 */
type IAxiosRequestConfigWithRetry = AxiosRequestConfig & { _dontRetry?: boolean };

/**
 * Reads the current access token outside of a component scope.
 *
 * @returns The in-memory bearer token, or `undefined` when not authenticated.
 */
export const getAccessToken = () => {
    const { accessToken } = storeToRefs(useProfileStore());
    return accessToken.value;
};

/**
 * Request payload type: deliberately unconstrained, since the generated clients
 * send everything from JSON envelopes to `FormData`.
 */
export type IAxiosRequestData = unknown;

/**
 * Shape every rejected request is normalized to (the backend reject envelope).
 */
export type IAxiosResponseErrorData = IResponseReject;

/**
 * Raw error response body, before normalization.
 */
export type IAxiosResponseErrorBody = unknown;

/**
 * Picks a user-facing message for a failed request.
 *
 * @param status - HTTP status code of the response.
 * @param fallback - Message to use when the status carries no specific wording.
 * @returns A canonical message for 401/403/5xx, the fallback otherwise.
 */
const getFallbackMessage = (status: number, fallback: string) => {
    if (status === 401) return 'Unauthorized';
    if (status === 403) return 'Forbidden';
    if (status >= 500) return 'Internal Server Error';
    return fallback;
};

/**
 * Endpoints that must never trigger the refresh-and-retry flow: a 401 there is
 * a genuine credential failure, not an expired token.
 */
const refreshExcludedPaths = new Set([
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
 * @returns `true` when the URL's pathname is one of the auth endpoints listed in
 *  {@link refreshExcludedPaths}.
 */
const shouldSkipRefresh = (url?: string) => {
    if (!url) return false;
    const pathname =
        url.startsWith('http://') || url.startsWith('https://') ? new URL(url).pathname : url;
    return refreshExcludedPaths.has(pathname);
};

/**
 * Creates the shared axios instance used by generated API clients.
 *
 * It centralizes:
 * - JSON headers
 * - cookie forwarding (for refresh token flow)
 * - request timeout
 */
const instance = axiosClient.create({
    headers: {
        Accept: 'application/json',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json; charset=utf-8'
    },
    // to automatically send cookies (including JWT refresh token)
    withCredentials: true,
    timeout: Number.parseInt(import.meta.env.VITE_AXIOS_TIMEOUT ?? '10000')
});

/**
 * Global default base URL for relative requests.
 */
// prefix of all relative calls. If a full URL is used, this will be ignored
instance.defaults.baseURL = import.meta.env.VITE_API_URL ?? '';

/**
 * Request interceptor: injects the bearer token (when authenticated) and the
 * active language.
 *
 * @param config - Outgoing request config.
 * @returns The same config with `Authorization` and `Accept-Language` set.
 */
export const onRequest = (config: InternalAxiosRequestConfig<IAxiosRequestData>) => {
    const { accessToken } = storeToRefs(useProfileStore());
    if (accessToken.value) config.headers.Authorization = `Bearer ${accessToken.value}`;
    // console.log('[request]', config);
    config.headers['Accept-Language'] = getCurrentLocale();
    return config;
};

/**
 * Request error interceptor: forwards transport/setup failures untouched.
 *
 * @param error - Error raised before the request left the client.
 * @returns A promise rejected with the same error.
 */
export const onRequestReject = (error: AxiosError) => {
    // console.log('[request error]', error);
    return Promise.reject(error);
};

/**
 * Former response success interceptor: used to unwrap every response to
 * `response.data` here, which made `instance.get()` et al. lie about their
 * return type (still typed as `AxiosResponse<T>`, actually resolving to `T`).
 *
 * Disabled — `instance` now always resolves with the real `AxiosResponse`.
 * The one sanctioned unwrap point is `orvalMutator` below. Kept for reference
 * in case a future need for a global response transform comes up.
 *
 * @param response - Successful axios response.
 * @returns The response body.
 */
// const onResponseSuccess = (response: AxiosResponse): AxiosResponse['data'] => response.data;

/**
 * Response error normalizer.
 *
 * Behavior:
 * - if the API already returned the standard reject envelope (`errors` field),
 *   pass it through (enriched with backend correlation IDs from headers)
 * - otherwise map unknown/transport errors to a safe fallback structure
 *
 * Backend correlation headers captured:
 * - `x-request-id` → requestId
 * - `x-trace-id`   → traceId
 *
 * @param error - Axios error, with or without a response.
 * @returns A promise always rejected with an {@link IAxiosResponseErrorData}
 *  envelope, so every call site sees the same error shape.
 */
export const onResponseReject = (
    error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>
): Promise<IAxiosResponseErrorData> => {
    // console.log('[response error]', error);
    const requestId = error.response?.headers?.['x-request-id'] as string | undefined;
    const traceId = error.response?.headers?.['x-trace-id'] as string | undefined;

    if (error.response?.data && Object.hasOwnProperty.call(error.response.data, 'errors')) {
        const envelope = error.response.data;
        return Promise.reject({
            ...envelope,
            ...(requestId && { requestId }),
            ...(traceId && { traceId })
        });
    }

    const status = error.response?.status ?? 500;
    const fallbackMessage = error.response?.statusText || error.message || 'Unknown error';
    const message = getFallbackMessage(status, fallbackMessage);
    const shouldLogServerError =
        import.meta.env.DEV && import.meta.env.VITE_APP_DEBUG_HTTP === 'true' && status >= 500;

    if (shouldLogServerError)
        // eslint-disable-next-line no-console
        console.error('------------- APP ERROR -------------', error);

    return Promise.reject({
        success: false,
        status,
        message,
        errors: status === 401 || status === 403 ? [message] : ([] as string[]),
        ...(requestId && { requestId }),
        ...(traceId && { traceId })
    });
};

/**
 * Response error interceptor with refresh support.
 *
 * Flow:
 * 1) if the request failed with 401 and was not already retried
 * 2) call `/account/refresh`
 * 3) store the new access token
 * 4) replay the original request once, marking `_dontRetry: true`
 *
 * @param error - Axios error that triggered the interceptor.
 * @returns The replayed request's response when the refresh succeeds; otherwise
 *  the normalized rejection from {@link onResponseReject}. Auth endpoints
 *  (see {@link shouldSkipRefresh}) never attempt a refresh.
 */
export const onResponseRejectWithRefresh = async (
    error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>
) => {
    const { accessToken } = storeToRefs(useProfileStore());
    const originalRequest = error.config as
        (InternalAxiosRequestConfig & { _dontRetry?: boolean }) | undefined;
    if (
        error.response?.status === 401 &&
        !originalRequest?._dontRetry &&
        !shouldSkipRefresh(originalRequest?.url)
    )
        return instance
            .get<IResponseSuccess<{ token: string }>>('/account/refresh', {
                _dontRetry: true
            } as IAxiosRequestConfigWithRetry)
            .then(({ data }) => {
                if (!data?.data?.token || !originalRequest) return;
                accessToken.value = data.data.token;
                return instance.request({
                    ...originalRequest,
                    _dontRetry: true
                } as IAxiosRequestConfigWithRetry);
            })
            .catch(() => onResponseReject(error));
    return onResponseReject(error);
};

/**
 * Handle all requests
 * (Intercept and modify requests before they are sent)
 */
instance.interceptors.request.use(onRequest, onRequestReject);

/**
 * Handle all responses
 * (Intercept and modify responses after they are received)
 */
instance.interceptors.response.use(undefined, onResponseRejectWithRefresh);

/**
 * Custom orval mutator: the *only* function allowed to call the shared axios
 * instance directly (see `orval.config.ts`'s `override.api.output.override.mutator`,
 * which points every generated client function through here). Anything that
 * needs to hit the API — generated or hand-written — goes through this, never
 * through `instance` itself, so there is exactly one place that unwraps the
 * response and exactly one place request/response behavior is configured.
 *
 * `instance` already handles:
 * - Base URL (VITE_API_URL)
 * - Bearer token header injection
 * - Accept-Language header
 * - Cookie forwarding (refresh token)
 * - 401 -> token refresh -> retry logic
 *
 * @typeParam T - Response payload type expected by the caller.
 * @param config - Request config.
 * @returns A promise resolving with the unwrapped response body (`response.data`).
 */
export const orvalMutator = <T>(config: AxiosRequestConfig): Promise<T> =>
    instance.request<T>(config).then((response) => response.data);
