import axiosClient from "axios";
import { i18n } from '@/plugins/i18n'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { IResponseReject, IResponseSuccess } from '@/types'
import { useProfileStore } from '@/stores/profile.ts'
import { storeToRefs } from 'pinia'
import { refreshTokenApi } from '@/api'

/**
 *
 */
export type IAxiosRequestData = unknown;

/**
 *
 */
export type IAxiosResponseData<T> = IResponseSuccess<T>;

/**
 *
 */
export type IAxiosResponseBody = unknown;

/**
 *
 */
export type IAxiosResponseErrorData = IResponseReject;

/**
 *
 */
export type IAxiosResponseErrorBody = unknown;



/**
 * Creates an initial 'axios' instance that can be customized
 */
const instance = axiosClient.create({
    headers: {
        'Accept': 'application/json',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json; charset=utf-8'
    },
    // to automatically send cookies (including JWT refresh token)
    withCredentials: true,
    timeout: Number.parseInt(import.meta.env.VITE_AXIOS_TIMEOUT as string | undefined ?? "10000"),
});



/**
 * Static Defaults
 */
// prefix of all relative calls. If a full URL is used, this will be ignored
instance.defaults.baseURL = import.meta.env.VITE_API_URL as string | undefined ?? "";



/**
 * Do something before request is sent
 *
 * @param config
 */
export const onRequest = (config: InternalAxiosRequestConfig<IAxiosRequestData>) => {
    const {
        accessToken
    } = storeToRefs(useProfileStore());
    if(accessToken.value)
        config.headers.Authorization = `Bearer ${accessToken.value}`;
    // config.headers['Content-Type'] = 'application/json';
    // console.log('[request]', config);
    // Current language at the time of the request
    config.headers['Accept-Language'] = i18n.global.locale.value;
    return config;
}

/**
 * Do something with request error
 *
 * @param error
 */
export const onRequestReject = (error: AxiosError) => {
    // console.log('[request error]', error);
    return Promise.reject(error);
}

/**
 * Any status code that lie within the range of 2xx cause this function to trigger
 *
 * @param response
 */
export const onResponseSuccess = <T>(response: AxiosResponse<IAxiosResponseData<T>, IAxiosResponseBody>) => {
    // console.log('[response]', response);
    return response.data;
}

/**
 * Any status codes that falls outside the range of 2xx cause this function to trigger
 * Translate un-catched errors into unknown IRejectResponse errors
 *
 * @param error
 */
export const onResponseReject = (error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>): Promise<IAxiosResponseErrorData> => {
    // console.log('[response error]', error);
    if(error.response?.data && Object.hasOwnProperty.call(error.response.data, "errors"))
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        return Promise.reject(error.response.data);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if(process.env.NODE_ENV !== 'production')
        // eslint-disable-next-line no-console
        console.error("------------- APP ERROR -------------", error);
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    return Promise.reject({
        success: false,
        status: 500,
        message: "Unknown error",
        errors: [] as string[]
    })
}

/**
 * Extension of the onResponseReject function
 *
 * If the error is a 401 and the request has an Authorization header,
 * it will try to refresh the token and retry the request
 *
 * @param error
 */
export const onResponseRejectWithRefresh = async (
    error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>
) => {
    const {
        accessToken
    } = storeToRefs(useProfileStore());
    // If it's keycloak auth error:
    // refresh the token and retry the request if not already retried
    if(error.response?.status === 401 && !Object.hasOwnProperty.call(error.config, "_dontRetry"))
        return refreshTokenApi()
            .then(({ data }) => {
                if(!data?.token || !error.config)
                    return;
                // if token is present, I'll retry the request
                accessToken.value = data.token;
                return instance.request({
                    ...error.config,
                    // @ts-expect-error _dontRetry is my custom property to understand if the request has already been retried
                    _dontRetry: true,
                    headers: {
                        // eslint-disable-next-line @typescript-eslint/no-misused-spread
                        ...error.config.headers,
                        // Do not retry the request again
                    }
                })
            })
    return onResponseReject(error);
    // if(config?.headers['Do-Not-Retry'])
    //     TODO LOGOUT
    // throw error;
}


/**
 * Handle all requests
 * (Intercept and modify requests before they are sent)
 */
instance.interceptors.request.use(onRequest, onRequestReject);

/**
 * Handle all responses
 * (Intercept and modify responses after they are received)
 */
// @ts-expect-error TODO check
instance.interceptors.response.use(onResponseSuccess, onResponseRejectWithRefresh);


/**
 * Complete custom axios instance
 */
export default instance;