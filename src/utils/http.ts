import axiosClient, {type AxiosError, type AxiosResponse } from "axios";

/**
 * Creates an initial 'axios' instance with custom settings.
 */
const axios = axiosClient.create({
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
    },
});

/**
 * Handle all requests
 */
axios.interceptors.request.use(
    /**
     * Do something before request is sent
     *
     * @param config
     */
    (config) => config,

    /**
     * Do something with request error
     *
     * @param error
     */
    (error) => Promise.reject(error),
);

/**
 * Handle all responses
 */
axios.interceptors.response.use(
    /**
     * Any status code that lie within the range of 2xx cause this function to trigger
     *
     * @param res
     */
    (res) => res.data,

    /**
     * Any status codes that falls outside the range of 2xx cause this function to trigger
     *
     * @param err
     */
    (err: AxiosError<any, any>) => {
        // if there is data (can be empty)
        if (err.response?.data)
            return Promise.reject(err.response.data);
        if (err.response)
            return Promise.reject(err.response);
        if (err.request)
            return Promise.reject(err.request);
        return Promise.reject(err.message);
    }
);

/**
 * Replaces main `axios` instance with the custom-one.
 *
 * @param cfg - Axios configuration object.
 * @returns A promise object of a response of the HTTP request with the 'data' object already
 * destructured.
 */
export default axios;