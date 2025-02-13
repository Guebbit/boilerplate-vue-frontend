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




// export const onResponseReject2 = async (
//     error: AxiosError<IAxiosResponseErrorData, IAxiosResponseErrorBody>
// ) => {
//     // If it's keycloak auth error:
//     // refresh the token and retry the request
//     if(error.response?.status === 401 && Object.hasOwnProperty.call(error.config?.headers, 'Authorization'))
//         return Promise.resolve() // TODO refresh token
//             .then(() => instance.request({
//                 ...error.config,
//                 headers: {
//                     ...error.config?.headers,
//                     // Do not retry the request again
//                     'Do-Not-Retry': 1
//                 }
//             }))
//     // if(error.config?.headers['Do-Not-Retry'])
//     //     LOGOUT
//     return Promise.reject(error);
// }




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
export const api = instance;