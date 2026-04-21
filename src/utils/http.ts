import axiosClient from 'axios';
import { getCurrentLocale } from '@/utils/i18n.ts';
import type {
    AxiosError,
    AxiosResponse,
    AxiosRequestConfig,
    InternalAxiosRequestConfig
} from 'axios';
import type { IResponseReject, IResponseSuccess } from '@/types';
import { useProfileStore } from '@/stores/profile.ts';
import { storeToRefs } from 'pinia';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const unwrapResponseData = <T>(value: { data?: T } | T): T | undefined =>
    isObjectRecord(value) && 'data' in value ? (value as { data?: T }).data : (value as T);

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
 *
 */
export const getAccessToken = () => {
    const { accessToken } = storeToRefs(useProfileStore());
    return accessToken.value;
};

/**
 *
 */
export type IAxiosRequestData = unknown;

/**
 *
 */
export type IAxiosResponseErrorData = IResponseReject;

/**
 *
 */
export type IAxiosResponseErrorBody = unknown;

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
 * Request interceptor:
 * - injects Bearer token (if available)
 * - injects current language in `Accept-Language`
 *
 * @param config
 */
export const onRequest = (config: InternalAxiosRequestConfig<IAxiosRequestData>) => {
    const { accessToken } = storeToRefs(useProfileStore());
    if (accessToken.value) config.headers.Authorization = `Bearer ${accessToken.value}`;
    // console.log('[request]', config);
    config.headers['Accept-Language'] = getCurrentLocale();
    return config;
};

/**
 * Request error interceptor.
 * Forwards transport/setup request errors as rejected promises.
 *
 * @param error
 */
export const onRequestReject = (error: AxiosError) => {
    // console.log('[request error]', error);
    return Promise.reject(error);
};

/**
 * Response success interceptor.
 * Passes the full AxiosResponse through unchanged; callers unwrap the
 * backend success envelope ({ data }) themselves.
 *
 * @param response
 */
export const onResponseSuccess = (
    response: AxiosResponse
): AxiosResponse | AxiosResponse['data'] =>
    import.meta.env.VITE_API_MOCK_ENABLED === 'true' ? response : response.data;

/**
 * Response error normalizer.
 *
 * Behavior:
 * - if API already returned the standard reject envelope (`errors` field),
 *   pass it through
 * - otherwise map unknown/transport errors to a safe fallback structure
 *
 * @param error
 */
export const onResponseReject = (
    error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>
): Promise<IAxiosResponseErrorData> => {
    // console.log('[response error]', error);
    if (error.response?.data && Object.hasOwnProperty.call(error.response.data, 'errors'))
        return Promise.reject(error.response.data);

    if (import.meta.env.VITE_API_MOCK_ENABLED === 'true' && isObjectRecord(error.response?.data)) {
        const normalizedError = error.response.data as Record<string, unknown>;
        const nestedError = isObjectRecord(normalizedError.error) ? normalizedError.error : undefined;
        const message =
            typeof nestedError?.message === 'string'
                ? nestedError.message
                : typeof normalizedError.message === 'string'
                  ? normalizedError.message
                  : 'Unknown error';
        return Promise.reject({
            success: false,
            status: error.response?.status ?? 500,
            message,
            errors: message ? [message] : []
        });
    }

    if (import.meta.env.NODE_ENV !== 'production')
        // eslint-disable-next-line no-console
        console.error('------------- APP ERROR -------------', error);

    return Promise.reject({
        success: false,
        status: 500,
        message: 'Unknown error',
        errors: [] as string[]
    });
};

/**
 * Response error interceptor with refresh support.
 *
 * Flow:
 * 1) if request failed with 401 and this request was not already retried
 * 2) call `/account/refresh`
 * 3) store the new access token
 * 4) replay the original request once, marking `_dontRetry: true`
 *
 * If refresh cannot solve it, fallback to `onResponseReject`.
 *
 * @param error
 */
export const onResponseRejectWithRefresh = async (
    error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>
) => {
    const { accessToken } = storeToRefs(useProfileStore());
    const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _dontRetry?: boolean })
        | undefined;
    if (error.response?.status === 401 && !originalRequest?._dontRetry)
        return instance
            .get<IResponseSuccess<{ token: string }>>('/account/refresh', {
                _dontRetry: true
            } as IAxiosRequestConfigWithRetry)
            .then(({ data }) => {
                const payload = unwrapResponseData<{ token?: string }>(data);
                if (!payload?.token || !originalRequest) return;
                accessToken.value = payload.token;
                return instance.request({
                    ...originalRequest,
                    _dontRetry: true
                } as IAxiosRequestConfigWithRetry);
            });
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
instance.interceptors.response.use(onResponseSuccess, onResponseRejectWithRefresh);

/**
 * Complete custom axios instance
 */
export default instance;
