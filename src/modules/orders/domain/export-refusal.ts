/**
 * @module
 * Tells the two refusals of `GET /orders/export` the screen words itself apart from every other
 * failure. Pure: reads the status and first error code off the rejection the HTTP layer builds.
 */

/**
 * The refusals that have their own copy.
 */
export type ExportRefusal = 'too-large' | 'rate-limited';

/**
 * Classifies a rejected export.
 *
 * - 422 `ORDER_EXPORT_TOO_LARGE`: the filters match more rows than the server's cap, before any byte.
 * - 429: the per-account export budget is spent.
 *
 * @param error - The rejected value, normally the reject envelope (`status`, `errors[]`).
 * @returns The refusal, or `undefined` for anything else (a failure the generic message covers).
 */
export const exportRefusalOf = (error: unknown): ExportRefusal | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    const { status, errors } = error as { status?: unknown; errors?: unknown };
    if (status === 429) return 'rate-limited';
    const first: unknown = Array.isArray(errors) ? errors[0] : undefined;
    const code =
        typeof first === 'object' && first !== null
            ? (first as { code?: unknown }).code
            : undefined;
    return status === 422 && code === 'ORDER_EXPORT_TOO_LARGE' ? 'too-large' : undefined;
};
