/**
 * @module
 * Leaf of the http tier: the one shared axios instance, configured but otherwise inert — no
 * interceptors, no imports of this app. `index.ts` wires the interceptors onto it.
 */

import axiosClient from 'axios';

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
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8'
    },
    withCredentials: true,
    timeout: Number.parseInt(import.meta.env.VITE_AXIOS_TIMEOUT ?? '10000')
});

// Prefix of every relative call; an absolute URL ignores it. `__E2E_API_URL` is the e2e shard
// runner's runtime override — each shard owns its own demo backend, and one built bundle cannot
// bake four URLs — set on the window before the app boots (see tests/support/e2e/commands.ts'
// `visit` overwrite). Nothing else ever defines it.
instance.defaults.baseURL =
    (globalThis as { __E2E_API_URL?: string }).__E2E_API_URL ?? import.meta.env.VITE_API_URL ?? '';
