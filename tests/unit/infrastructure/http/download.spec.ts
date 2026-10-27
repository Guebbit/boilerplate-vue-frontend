/**
 * @module
 * `download.ts` — the server names every file it sends. A blob answer carrying a named
 * `Content-Disposition` becomes a `File` of that name, so a call site saves `file.name` instead of
 * inventing one; anything the server did not name stays a plain `Blob` and refuses to be saved.
 */
import { asStub } from '../../../support/stub';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '@guebbit/js-toolkit';
import { onDownloadResponse, saveDownload } from '@/infrastructure/http/download.ts';

// `downloadBlob` saves through a throwaway link, which jsdom cannot do; what matters is what it
// is handed.
vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    downloadBlob: vi.fn()
}));

/**
 * A response the way axios hands one to a success interceptor.
 *
 * @param data - The body: a Blob for a download, anything else for a JSON answer.
 * @param disposition - The `Content-Disposition` header, when the server sent one.
 */
const answered = (data: unknown, disposition?: string) =>
    asStub<AxiosResponse>({
        data,
        headers: disposition === undefined ? {} : { 'content-disposition': disposition }
    });

beforeEach(() => {
    vi.clearAllMocks();
});

describe('onDownloadResponse', () => {
    it('turns a named blob into a File of that name, keeping its bytes and type', async () => {
        const response = onDownloadResponse(
            answered(
                new Blob(['%PDF'], { type: 'application/pdf' }),
                'inline; filename="invoice-2026-0042.pdf"'
            )
        );

        expect(response.data).toBeInstanceOf(File);
        expect(response.data).toHaveProperty('name', 'invoice-2026-0042.pdf');
        expect(response.data).toHaveProperty('type', 'application/pdf');
        await expect((response.data as File).text()).resolves.toBe('%PDF');
    });

    it('reads an RFC 8187 `filename*` in preference to the plain fallback', () => {
        const response = onDownloadResponse(
            answered(
                new Blob(['x']),
                `attachment; filename="caffe.csv"; filename*=UTF-8''caff%C3%A8.csv`
            )
        );

        expect(response.data).toHaveProperty('name', 'caffè.csv');
    });

    it('leaves a blob the server did not name alone', () => {
        const blob = new Blob(['x']);

        expect(onDownloadResponse(answered(blob)).data).toBe(blob);
    });

    it('leaves a malformed header alone rather than failing a download that worked', () => {
        const blob = new Blob(['x']);

        expect(onDownloadResponse(answered(blob, 'attachment; filename="')).data).toBe(blob);
    });

    it('does not touch a JSON answer that happens to carry the header', () => {
        const body = { id: 'p1' };

        expect(onDownloadResponse(answered(body, 'attachment; filename="x.json"')).data).toBe(body);
    });
});

describe('saveDownload', () => {
    it('saves a named file under its own name', () => {
        const file = new File(['x'], 'orders-2026-10-27.csv');

        saveDownload(file);

        expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(file, 'orders-2026-10-27.csv');
    });

    it('refuses a plain blob instead of saving it under an invented name', () => {
        expect(() => {
            saveDownload(new Blob(['x']));
        }).toThrow(TypeError);
        expect(downloadBlob).not.toHaveBeenCalled();
    });
});
