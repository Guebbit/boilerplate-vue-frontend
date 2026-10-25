/**
 * @module
 * Type-guard based readers for the `errors` list an RFC 9457 problem document carries. They narrow
 * to a plain object first and check the key, so nothing here trusts a declared type past the wire.
 *
 * A success has nothing to unwrap: its body is the payload itself (see docs/api/responses.md).
 *
 * Here rather than in a store because the problem shape is a property of the transport: every
 * refusal arrives in it, and none of it is the session's business.
 */

import type { ErrorCode } from '@api/error-codes';
import { parseJsonSafe } from '@/infrastructure/utils/safe-storage.ts';

/**
 * One structured error as the reject envelope carries it. Both fields stay `unknown`: the shape
 * is asserted by the generated types, never verified, so the reader narrows and the caller checks.
 */
export interface ApiErrorItem {
    /** Machine-readable reason, e.g. `REAUTH_REQUIRED`. */
    code?: unknown;
    /** Per-code extra payload, e.g. `retryAfter` on a rate-limit refusal. */
    details?: unknown;
}

/**
 * Narrows any value to a plain keyed object.
 *
 * @param value - Value to test.
 * @returns `true` when `value` is a non-null object.
 */
export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * A body as an object: a string is parsed as JSON first. A request made with
 * `responseType: 'text'` (the orders CSV export) hands even its error envelope over as a string,
 * and a step-up challenge on it would otherwise go unread.
 *
 * @param value - The raw body, still unknown at this boundary.
 * @returns The parsed body for a JSON string, `undefined` for any other string, else `value` as is.
 */
const parsedBody = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    return parseJsonSafe(value);
};

/**
 * Reads `errors[0]` off a rejection — the envelope `onResponseReject` builds, or an axios error's
 * own `response.data`. An empty `errors` array is legal at the type level, so nothing here may
 * assume there is a first entry.
 *
 * @param value - The rejected value, or the raw error body; still unknown at this boundary.
 * @returns The first structured error, or `undefined` when the shape does not match.
 */
export const getFirstApiError = (value: unknown): ApiErrorItem | undefined => {
    const body = parsedBody(value);
    if (!isObjectRecord(body)) return undefined;
    const items = body.errors;
    if (!Array.isArray(items)) return undefined;
    const [item] = items as unknown[];
    return isObjectRecord(item) ? item : undefined;
};

/**
 * Reads `details.retryAfter` off a cooldown refusal with the given code — the server's own
 * seconds-to-wait, so a button can count down the number the server will actually enforce.
 *
 * @param value - Whatever a `.catch` caught, still unknown at this boundary.
 * @param code - The refusal's stable code, e.g. `EMAIL_VERIFY_RESEND_TOO_SOON`.
 * @returns The seconds to wait, or `undefined` when this is not that refusal.
 */
export const getRetryAfter = (value: unknown, code: ErrorCode): number | undefined => {
    const { code: actual, details } = getFirstApiError(value) ?? {};
    if (actual !== code || !isObjectRecord(details)) return undefined;
    return typeof details.retryAfter === 'number' ? details.retryAfter : undefined;
};
