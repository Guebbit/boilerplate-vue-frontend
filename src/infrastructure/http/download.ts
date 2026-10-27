/**
 * @module
 * Downloads, client side: the server names every file it sends (`Content-Disposition`, RFC 6266),
 * so a blob answer that carries the header is turned into a `File` bearing that name. A call site
 * then saves `file.name` and never invents one.
 *
 * Wired onto the shared axios instance by `index.ts`. A leaf of the http tier: it imports the
 * header parser and nothing of this app.
 */
import type { AxiosResponse } from 'axios';
import { downloadBlob } from '@guebbit/js-toolkit';
// content-disposition `parse(header)`: the type and the decoded parameters, `filename*` (RFC 8187)
// included. It throws on a malformed header. https://github.com/jshttp/content-disposition
import { parse } from 'content-disposition';

/**
 * The filename a `Content-Disposition` header names, or `undefined` when it is malformed or
 * names none.
 *
 * @param header - The raw header value.
 * @returns The decoded file name.
 */
const filenameOf = (header: string): string | undefined => {
    // eslint-disable-next-line no-restricted-syntax -- `parse` throws on a malformed header and has no non-throwing form; the failure has one local answer (keep the plain Blob)
    try {
        return parse(header).parameters.filename;
    } catch {
        // A malformed header is the server's slip, not a reason to fail a download that worked.
        return undefined;
    }
};

/**
 * Response interceptor: a blob answer with a named `Content-Disposition` becomes a `File` of that
 * name; anything else passes through untouched.
 *
 * @param response - A successful response.
 * @returns The same response, its blob body replaced by a named `File` when the server named one.
 */
export const onDownloadResponse = (response: AxiosResponse): AxiosResponse => {
    const header: unknown = response.headers['content-disposition'];
    if (!(response.data instanceof Blob) || typeof header !== 'string') return response;

    const name = filenameOf(header);
    if (name) response.data = new File([response.data], name, { type: response.data.type });
    return response;
};

/**
 * Saves a downloaded file under the name the server gave it.
 *
 * Narrowed with `instanceof File`, never cast: a plain `Blob` means the answer carried no usable
 * `Content-Disposition` (or the browser was not allowed to read it, see the API's CORS
 * `exposedHeaders`), and saving it under an invented name would hide that.
 *
 * @param file - What a download call resolved with.
 * @throws {TypeError} When the answer was not named by the server.
 */
export const saveDownload = (file: Blob): void => {
    if (!(file instanceof File)) throw new TypeError('The download carried no file name.');
    // js-toolkit `downloadBlob(blob, filename)`: saves the blob through a throwaway link.
    downloadBlob(file, file.name);
};
