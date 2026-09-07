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
 * Shape every rejected request is normalized to: the contract's own reject envelope, plus the
 * two correlation ids `onResponseReject` lifts off the response headers.
 *
 * The ids are not in `openapi.yaml` because they never travel in the body — they are
 * `x-request-id` and `x-trace-id`, and this tier is where a header becomes a field.
 */
export type AxiosResponseErrorData = ErrorResponse & {
    /**
     * Backend request correlation id, from the `x-request-id` header. Absent when unsent.
     */
    requestId?: string;
    /**
     * Distributed-trace id, from the `x-trace-id` header. Absent when unsent.
     */
    traceId?: string;
};

/**
 * Raw error response body, before normalization.
 */
export type AxiosResponseErrorBody = unknown;

/**
 * Request config carrying the retry loop guard.
 *
 * Optional so normal call sites never have to set it; only the refresh flow does.
 */
export type AxiosRequestConfigWithRetry = AxiosRequestConfig & { _dontRetry?: boolean };
