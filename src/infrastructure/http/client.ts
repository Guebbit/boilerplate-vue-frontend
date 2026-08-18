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

// Prefix of every relative call; an absolute URL ignores it.
instance.defaults.baseURL = import.meta.env.VITE_API_URL ?? '';
