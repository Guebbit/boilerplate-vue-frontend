/**
 * @module
 * Problem details this client builds itself, for the failures no server answered with one: a
 * dropped connection, a bare proxy error, a response that broke the contract. Same shape the API
 * sends (RFC 9457), so every catch downstream reads one thing. Always exactly one `errors` item,
 * because the contract's `errors` is never empty. Also reads a problem body that arrived as text.
 */

import { parseJsonSafe } from '@/infrastructure/utils/safe-storage.ts';
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

/**
 * The response body, with a `application/problem+json` one read into an object whatever form axios
 * handed it over in.
 *
 * `responseType: 'text'` (the orders CSV export) and `'blob'` (a file download) skip axios's JSON
 * parse, so their refusal arrives as a string or a Blob and its `errors` would go unread. The media
 * type is the signal: the API sends a refusal as `application/problem+json` and a file as anything
 * else, so a file's bytes are never parsed.
 *
 * @param response - The axios response of a failed request.
 * @returns The body as an object when it is problem JSON, otherwise exactly what axios delivered.
 */
export const readProblemBody = (response: {
    data: unknown;
    headers: Record<string, unknown>;
}): Promise<unknown> => {
    const { data, headers } = response;
    const mediaType = headers['content-type'];
    if (typeof mediaType !== 'string' || !mediaType.startsWith('application/problem+json'))
        return Promise.resolve(data);
    if (typeof data === 'string') return Promise.resolve(parseJsonSafe(data) ?? data);
    // https://developer.mozilla.org/docs/Web/API/Blob/text
    if (data instanceof Blob) return data.text().then((text) => parseJsonSafe(text) ?? data);
    return Promise.resolve(data);
};
