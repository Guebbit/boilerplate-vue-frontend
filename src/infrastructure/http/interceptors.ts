import { storeToRefs } from 'pinia';
import { apiText, getCurrentLocale } from '@/infrastructure/i18n';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { logger } from '@/infrastructure/utils/logger.ts';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AxiosRequestData, AxiosResponseErrorBody, AxiosResponseErrorData } from './types.ts';

/**
 * Reads the current access token outside of a component scope.
 *
 * @returns The in-memory bearer token, or `undefined` when not authenticated.
 */
export const getAccessToken = () => {
    const { accessToken } = storeToRefs(useSessionStore());
    return accessToken.value;
};

/**
 * Picks a user-facing message for a failed request.
 *
 * Only for the cases where the API sent no message of its own — an empty body, a proxy's bare
 * 502, a request that never reached anything. Everything else prints what the server sent.
 *
 * The keys live under `api-errors.*` in this app's own dictionary because they have to work
 * precisely when the BE is unreachable; `apiText` prefers the BE's wording under `api.*` when
 * that dictionary happens to be loaded.
 *
 * @param status - HTTP status code of the response.
 * @param fallback - Message to use when the status carries no specific wording.
 * @returns A canonical message for 401/403/5xx, the fallback otherwise.
 */
const getFallbackMessage = (status: number, fallback: string) => {
    if (status === 401) return apiText('generic.error-unauthorized', 'api-errors.unauthorized');
    if (status === 403) return apiText('generic.error-forbidden', 'api-errors.forbidden');
    if (status >= 500) return apiText('generic.error-internal', 'api-errors.internal-server-error');
    return fallback;
};

/**
 * Request interceptor: injects the bearer token (when authenticated) and the active language.
 *
 * @param config - Outgoing request config.
 * @returns The same config with `Authorization` and `Accept-Language` set.
 */
export const onRequest = (config: InternalAxiosRequestConfig<AxiosRequestData>) => {
    const { accessToken } = storeToRefs(useSessionStore());
    if (accessToken.value) config.headers.Authorization = `Bearer ${accessToken.value}`;
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
    return Promise.reject(error);
};

/*
 * There is deliberately no response SUCCESS interceptor. Unwrapping to `response.data` here
 * would make `instance.get()` lie about its return type — still `AxiosResponse<T>`, actually
 * resolving to `T`. `orvalMutator` is the one sanctioned unwrap point.
 */

/**
 * Response error normalizer: every rejection reaches a call site in the same envelope.
 *
 * A response that already carries the standard `errors` field passes through, enriched with the
 * backend correlation headers (`x-request-id` → requestId, `x-trace-id` → traceId); anything
 * else — transport failure, bare proxy error — is mapped onto the same shape.
 *
 * @param error - Axios error, with or without a response.
 * @returns A promise always rejected with an {@link AxiosResponseErrorData} envelope.
 */
export const onResponseReject = (
    error: AxiosError<AxiosResponseErrorData, AxiosResponseErrorBody>
): Promise<AxiosResponseErrorData> => {
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
    const fallbackMessage =
        error.response?.statusText ||
        error.message ||
        apiText('generic.error-unknown', 'api-errors.unknown');
    const message = getFallbackMessage(status, fallbackMessage);
    // A 5xx is the server's problem, not this client's, so it is a trace rather than an error
    // here — opt in with `VITE_APP_LOG_SCOPES=http`.
    if (status >= 500) logger.debug('http', '------------- APP ERROR -------------', error);

    return Promise.reject({
        success: false,
        status,
        message,
        errors: status === 401 || status === 403 ? [message] : ([] as string[]),
        ...(requestId && { requestId }),
        ...(traceId && { traceId })
    });
};
