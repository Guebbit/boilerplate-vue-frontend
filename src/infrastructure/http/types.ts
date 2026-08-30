/**
 * @module
 * Shared type aliases for the http tier: the request/error payload shapes and the retry-loop-guard
 * config extension, referenced across `interceptors.ts`, `refresh.ts` and `index.ts`.
 */

import type { AxiosRequestConfig } from 'axios';
import type { ResponseReject } from '@/types';

/**
 * Request payload type: deliberately unconstrained, since the generated clients
 * send everything from JSON envelopes to `FormData`.
 */
export type AxiosRequestData = unknown;

/**
 * Shape every rejected request is normalized to (the backend reject envelope).
 */
export type AxiosResponseErrorData = ResponseReject;

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
