/**
 * @module
 * Registers the request and response interceptors on the shared axios instance.
 *
 * Kept out of `index.ts` on purpose: the interceptors read the session store, which reads the
 * generated client, which imports `index.ts`'s `orvalMutator` — a cycle `npm run check` refuses.
 * `src/main.ts` calls {@link installHttpInterceptors} once at boot, and a spec that goes through
 * the real instance calls it in its own setup.
 */
import { instance } from './client.ts';
import { onRequest, onRequestReject } from './interceptors.ts';
import { onEtagRequest, onEtagResponse } from './etag.ts';
import { onDownloadResponse } from './download.ts';
import { onResponseRejectWithStepUp } from './step-up.ts';

/**
 * Wires every interceptor onto the shared instance. Call it once per process: a second call
 * registers each handler again.
 */
export const installHttpInterceptors = (): void => {
    // axios `interceptors.<side>.use(onFulfilled, onRejected)`: a handler is skipped by passing
    // `undefined`. Request interceptors run last-registered first; response ones in registration order.
    // https://axios-http.com/docs/interceptors
    instance.interceptors.request.use(onRequest, onRequestReject);
    // After `onRequest`: only reads and adds a header, so the order with auth is not load-bearing —
    // kept beside it so both request-side wirings are found together.
    instance.interceptors.request.use(onEtagRequest);
    // Observes every success without unwrapping it (see the note in `interceptors.ts`); failures pass
    // on untouched to the step-up wrapper below.
    instance.interceptors.response.use(onEtagResponse);
    // A blob the server named (`Content-Disposition`) becomes a `File`, so call sites save `file.name`.
    instance.interceptors.response.use(onDownloadResponse);
    // Step-up wraps refresh: a `REAUTH_REQUIRED` 401 has to be caught before the refresh branch would
    // "fix" it by renewing a cookie that was never the problem — see `step-up.ts`'s own module doc.
    instance.interceptors.response.use(undefined, onResponseRejectWithStepUp);
};
