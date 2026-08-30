/**
 * @module
 * Composition root of the http tier: imports the leaf modules, wires the interceptors onto the
 * shared axios instance, and exposes `orvalMutator` as the one function every generated client
 * call goes through.
 */

/**
 * The API transport: one axios instance, its interceptors, and the single unwrap point.
 *
 * This file is the tier's public surface — `orval.config.ts` points every generated client at
 * `orvalMutator` here, and the request interceptors are re-exported beside it because their specs
 * exercise them through this module. Everything else is imported from its own leaf file.
 */
import { instance } from './client.ts';
import { onRequest, onRequestReject } from './interceptors.ts';
import { onResponseRejectWithRefresh } from './refresh.ts';
import { shouldValidateResponses, validateResponseAgainstContract } from './validate.ts';
import type { AxiosRequestConfig } from 'axios';

instance.interceptors.request.use(onRequest, onRequestReject);
instance.interceptors.response.use(undefined, onResponseRejectWithRefresh);

/**
 * Custom orval mutator: the *only* function allowed to call the shared axios instance directly.
 * Anything that needs the API — generated or hand-written — goes through here, so there is
 * exactly one place that unwraps a response and one place behaviour is configured.
 *
 * The second parameter is what orval calls the mutator's "second arg": declaring it gives every
 * generated function an `options?` argument, which is the supported way to pass per-call axios
 * config (`onUploadProgress` for uploads, `signal` for cancellation) without reaching for
 * `orvalMutator` directly. `config` comes from codegen and wins on conflict.
 *
 * `headers` merge one level deeper on purpose: every generated call with a body sets
 * `Content-Type`, so a top-level merge would drop the caller's headers on exactly the requests
 * most likely to need one — including the multipart boundary.
 *
 * @typeParam T - Response payload type expected by the caller.
 * @param config - Request config, built by the generated client.
 * @param options - Per-call axios overrides supplied by the caller.
 * @returns A promise resolving with the unwrapped response body (`response.data`).
 */
export const orvalMutator = <T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig
): Promise<T> => {
    const request: AxiosRequestConfig = {
        ...options,
        ...config,
        // eslint-disable-next-line @typescript-eslint/no-misused-spread -- AxiosHeaders' own enumerable entries are exactly what an object spread copies; axios documents this merge
        headers: { ...options?.headers, ...config.headers }
    };
    return instance.request<T>(request).then((response) => {
        if (shouldValidateResponses()) validateResponseAgainstContract(request, response.data);
        return response.data;
    });
};

export { onRequest, onRequestReject, onResponseReject } from './interceptors.ts';
