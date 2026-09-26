/**
 * @module
 * Shared type aliases for the http tier: the request/error payload shapes and the retry-loop-guard
 * config extension, referenced across `interceptors.ts`, `refresh.ts` and `index.ts`.
 */

import type { AxiosRequestConfig } from 'axios';
import type { ErrorResponse } from '@/types';

/**
 * Request payload type: deliberately unconstrained, since the generated clients
 * send everything from JSON envelopes to `FormData`.
 */
export type AxiosRequestData = unknown;

/**
 * Shape every rejected request is normalized to: the contract's own reject envelope, plus what
 * `onResponseReject` lifts off the request/response for Faro to name the error by.
 *
 * None of these travel in the body, so this tier is where each becomes a field: `requestId` and
 * `traceparent` are headers, `method`/`path` come off the request config that produced the
 * rejection.
 */
export type AxiosResponseErrorData = ErrorResponse & {
    /**
     * Backend request correlation id, from the `x-request-id` header. Absent when unsent.
     */
    requestId?: string;
    /**
     * W3C trace context, from the `traceparent` header — both backends expose this, never
     * `x-trace-id`, which nothing here has ever actually sent.
     */
    traceparent?: string;
    /**
     * HTTP method of the request that failed, upper-cased. Absent only when the config carried
     * none, which does not happen through the generated client.
     */
    method?: string;
    /**
     * Pathname of the request that failed — no origin, no query string, so it groups with every
     * other call to the same route regardless of caller-supplied ids.
     */
    path?: string;
};

/**
 * Raw error response body, before normalization.
 */
export type AxiosResponseErrorBody = unknown;

/**
 * Request config carrying the two retry loop guards — one per branch, so a request already
 * refreshed once may still be stepped up once, and vice versa : each guard blocks only the
 * attempt it names, never the other.
 *
 * Optional so normal call sites never have to set either; only `refresh.ts` and `step-up.ts` do.
 */
export type AxiosRequestConfigWithRetry = AxiosRequestConfig & {
    /**
     * This request has already gone through one refresh-and-replay; the refresh branch must not
     * run on it again. Also set on the refresh call itself, so ITS OWN 401 cannot trigger another
     * refresh.
     */
    _refreshed?: boolean;
    /**
     * This request has already gone through one step-up-and-replay; the step-up branch must not
     * run on it again.
     */
    _steppedUp?: boolean;
};
