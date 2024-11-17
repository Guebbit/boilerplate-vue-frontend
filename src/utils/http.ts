import axiosClient from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { i18n } from '@/plugins/i18n'

/**
 *
 */
export type IAxiosRequestData = unknown;

/**
 *
 */
export type IAxiosResponseData = unknown;

/**
 *
 */
export type IAxiosResponseBody = unknown;

/**
 *
 */
export type IAxiosResponseErrorData = unknown;

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
    timeout: import.meta.env.VITE_AXIOS_TIMEOUT || 10000,
});



/**
 * Defaults
 */
// axios.defaults.baseURL = import.meta.env.VITE_APP_API_URL || "";



/**
 * Do something before request is sent
 *
 * @param config
 */
export const onRequest = (config: InternalAxiosRequestConfig<IAxiosRequestData>) => {
    // config.headers['Authorization'] = `Bearer ${TOKEN}`;
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
export const onResponseSuccess = (response: AxiosResponse<IAxiosResponseData, IAxiosResponseBody>) => {
    // console.log('[response]', response);
    return response;
}

/**
 * Any status codes that falls outside the range of 2xx cause this function to trigger
 *
 * @param error
 */
export const onResponseReject = (error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>) => {
    // console.log('[response error]', error);
    // error.response.status
    return Promise.reject(error);
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
instance.interceptors.response.use(onResponseSuccess, onResponseReject);


/**
 * Complete custom axios instance
 */
export default instance;