/**
 * @module
 * Type-guard based readers for the `{ data }` envelope the API wraps most payloads in: narrow to a
 * plain object first, then check for the `data` key, so a wrapped and an unwrapped response are
 * both handled by the same call site.
 *
 * Here rather than in a store because the envelope is a property of the transport: a login
 * response and a product list arrive in the same wrapper, and neither is the session's business.
 */

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
 * Reads the access token out of a login or refresh response, wrapped or not.
 *
 * @param response - Raw API response.
 * @returns The token, or `undefined` when the response carries none.
 */
export const getTokenFromResponse = (response?: unknown): string | undefined => {
    // Top-level `{ token }` is checked first for tolerance only: the contract's
    // `LoginResponseEnvelope` always wraps it under `data`, same as refresh.
    if (isObjectRecord(response)) {
        const maybeToken = response.token;
        if (typeof maybeToken === 'string') return maybeToken;
    }
    if (isWrappedResponse<{ token?: string }>(response)) return response.data?.token;
    return undefined;
};

/**
 * Extracts the payload from both wrapped (`{ data }`) and direct responses.
 *
 * @typeParam T - Expected payload type.
 * @param response - Raw API response.
 * @returns The unwrapped payload, or `undefined` when absent.
 */
export const getPayloadFromResponse = <T>(response?: { data?: T } | T): T | undefined =>
    isWrappedResponse<T>(response) ? response.data : response;
