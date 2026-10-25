/**
 * @module
 * Problem details this client builds itself, for the failures no server answered with one: a
 * dropped connection, a bare proxy error, a response that broke the contract. Same shape the API
 * sends (RFC 9457), so every catch downstream reads one thing. Always exactly one `errors` item,
 * because the contract's `errors` is never empty.
 */

import type { Problem } from '@/types';

/**
 * A problem document with one error item.
 *
 * @param status - HTTP status, or `0` when nothing answered at all.
 * @param title - The status phrase; English, like the API's.
 * @param code - The error item's machine code.
 * @param message - The sentence for the user; becomes both `detail` and the item's message.
 * @returns The problem, ready to be rejected with.
 */
export const syntheticProblem = (
    status: number,
    title: string,
    code: string,
    message: string
): Problem => ({
    type: 'about:blank',
    title,
    status,
    detail: message,
    errors: [{ code, message }]
});
