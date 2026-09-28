/**
 * `useAxiosUploadProgress` (FA84) — the one Axios wiring six forms (avatar, product image, user
 * image) used to repeat by hand. What is worth pinning here is not the toolkit's own tracking
 * logic, already its business, but this wrapper's two decisions: `trackUpload` only tracks when a
 * file is actually attached, and a raw `AxiosProgressEvent` becomes the 0–1 fraction the toolkit
 * expects.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';

describe('useAxiosUploadProgress — trackUpload', () => {
    it('runs the call with tracking options when a file is attached', () => {
        const { trackUpload } = useAxiosUploadProgress();
        const send = vi.fn((options?: AxiosRequestConfig) => Promise.resolve(options));

        return trackUpload(new File(['x'], 'x.png'), send).then((options) => {
            expect(send).toHaveBeenCalledOnce();
            expect(options).toEqual(
                expect.objectContaining({ onUploadProgress: expect.any(Function) })
            );
        });
    });

    it('runs the call with no options at all when nothing was picked, same as an untracked save', () => {
        const { trackUpload } = useAxiosUploadProgress();
        const send = vi.fn((options?: AxiosRequestConfig) => Promise.resolve(options));

        return trackUpload(undefined, send).then((options) => {
            expect(send).toHaveBeenCalledWith();
            expect(options).toBeUndefined();
        });
    });
});

describe('useAxiosUploadProgress — progress', () => {
    it('reports a 0–1 AxiosProgressEvent fraction straight through to the bar', () => {
        const { progress, trackUpload } = useAxiosUploadProgress();
        let capturedOptions: AxiosRequestConfig | undefined;

        const settled = trackUpload(new File(['x'], 'x.png'), (options) => {
            capturedOptions = options;
            return Promise.resolve();
        });

        // The toolkit sets progress to 0 the instant tracking starts, before any real event.
        expect(progress.value).toBe(0);

        capturedOptions?.onUploadProgress?.({ progress: 0.42 } as AxiosProgressEvent);
        expect(progress.value).toBe(42);

        return settled;
    });

    it('falls back to 0 when the event carries no progress fraction — a chunked or compressed request', () => {
        const { progress, trackUpload } = useAxiosUploadProgress();
        let capturedOptions: AxiosRequestConfig | undefined;

        const settled = trackUpload(new File(['x'], 'x.png'), (options) => {
            capturedOptions = options;
            return Promise.resolve();
        });

        capturedOptions?.onUploadProgress?.({} as AxiosProgressEvent);
        expect(progress.value).toBe(0);

        return settled;
    });

    it('returns to idle once the tracked call settles, success or failure', () => {
        const { progress, trackUpload } = useAxiosUploadProgress();

        return trackUpload(new File(['x'], 'x.png'), () =>
            Promise.reject(new Error('upload failed'))
        )
            .catch(() => {})
            .then(() => {
                expect(progress.value).toBeUndefined();
            });
    });
});
