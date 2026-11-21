/**
 * @module
 * Leaf of the http tier: the one shared axios instance, configured but otherwise inert — no
 * interceptors, no imports of this app. `index.ts` wires the interceptors onto it.
 */

import axiosClient from 'axios';
import { readApiUrl, runtimeValue } from '@/infrastructure/runtime-config';

/**
 * The shared axios instance every generated client goes through.
 *
 * Deliberately imports nothing of this app: it is the leaf of the http tier, so importing it can
 * never re-enter `index.ts` mid-evaluation.
 *
 * `withCredentials` is what carries the httpOnly refresh cookie, so the refresh flow works
 * without the token ever being readable from JS.
 */
export const instance = axiosClient.create({
    headers: {
        // Success is JSON; every refusal is `application/problem+json` (RFC 9457). axios parses both.
        Accept: 'application/json, application/problem+json',
        'Content-Type': 'application/json; charset=utf-8'
    },
    withCredentials: true,
    /**
     * Repeat an array parameter (`?id=a&id=b`), which is what the contract declares (OpenAPI
     * `style: form, explode: true`) and what the backend reads. axios' default is `?id[]=a&id[]=b`,
     * which the backend refuses as an unknown field `id[]`.
     * https://axios-http.com/docs/req_config (`paramsSerializer.indexes`: `null` for no brackets)
     */
    paramsSerializer: { indexes: null },
    timeout: Number.parseInt(
        runtimeValue('AXIOS_TIMEOUT') || import.meta.env.VITE_AXIOS_TIMEOUT || '10000'
    )
});

/**
 * Prefix of every relative call; an absolute URL ignores it. The e2e shard runner sets
 * `window.__APP_CONFIG.API_URL` before the app boots (see `tests/support/e2e/commands.ts`'s
 * `visit` overwrite) — each shard owns its own demo backend, and one built bundle cannot bake four
 * URLs. Outside e2e, a running container's own `config.js` wins the same way.
 */
instance.defaults.baseURL = readApiUrl();
