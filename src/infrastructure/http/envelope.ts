/**
 * @module
 * Type-guard based readers for the two envelopes the API answers in: the `{ data }` wrapper around
 * a payload, and the `{ errors: [...] }` list a rejection carries. Both narrow to a plain object
 * first and check the key, so nothing here trusts a declared type past the wire.
 *
 * Here rather than in a store because the envelope is a property of the transport: a login
 * response and a product list arrive in the same wrapper, and neither is the session's business.
 */

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
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * Detects the `{ data }` envelope.
 *
 * @param response - Raw API response.
 * @returns `true` when the value carries a `data` property.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the type parameter names the caller's payload in the predicate; without it the narrowing is to `unknown`
const isWrappedResponse = <T>(response: unknown): response is { data?: T } =>
    isObjectRecord(response) && 'data' in response;

/**
 * Reads the access token out of a login or refresh response.
 *
 * @param response - Raw API response.
 * @returns The token, or `undefined` when the response carries none.
 */
export const getTokenFromResponse = (response?: unknown): string | undefined =>
    isWrappedResponse<{ token?: string }>(response) ? response.data?.token : undefined;

/**
 * Extracts the payload from both wrapped (`{ data }`) and direct responses.
 *
 * @template T - Expected payload type.
 * @param response - Raw API response.
 * @returns The unwrapped payload, or `undefined` when absent.
 */
export const getPayloadFromResponse = <T>(response?: { data?: T } | T): T | undefined =>
    isWrappedResponse<T>(response) ? response.data : response;

/**
 * Reads `errors[0]` off a rejection — the envelope `onResponseReject` builds, or an axios error's
 * own `response.data`. An empty `errors` array is legal at the type level, so nothing here may
 * assume there is a first entry.
 *
 * @param value - The rejected value, or the raw error body; still unknown at this boundary.
 * @returns The first structured error, or `undefined` when the shape does not match.
 */
export const getFirstApiError = (value: unknown): ApiErrorItem | undefined => {
    if (!isObjectRecord(value)) return undefined;
    const items = value.errors;
    if (!Array.isArray(items)) return undefined;
    const [item] = items as unknown[];
    return isObjectRecord(item) ? item : undefined;
};
