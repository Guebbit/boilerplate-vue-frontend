/**
 * The axios binding around the toolkit's upload-progress state machine —
 * `src/infrastructure/composables/useUploadProgress.ts`.
 *
 * The state machine itself is the toolkit's and tested there. What is this app's, and therefore
 * tested here, is the axios shape: the `onUploadProgress` callback handed to the call, the 0–1
 * fraction it reports, and the "no file, no tracking" rule.
 */
import { describe, expect, it, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

import { useUploadProgress } from '@/infrastructure/composables/useUploadProgress.ts';

/**
 * Pulls the `onUploadProgress` callback out of the axios options `trackUpload` handed to `send`,
 * so a test can drive the progress bar without a real request.
 */
const progressCallbackOf = (options?: AxiosRequestConfig) => options?.onUploadProgress;

/** Fires that callback with a partial axios progress event. */
const reportProgress = (
    options: AxiosRequestConfig | undefined,
    event: Partial<AxiosProgressEvent>
) => progressCallbackOf(options)?.(event as AxiosProgressEvent);

/**
 * A file of an exact byte length, without allocating a real image: nothing here looks at the
 * contents, only at whether there is a file at all.
 */
const fileOfSize = (bytes: number, type = 'image/png') =>
    new File([new Uint8Array(bytes)], 'photo.png', { type });

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useUploadProgress', () => {
    /**
     * `undefined` and `0` are different states — idle, versus a request that has started and sent
     * nothing yet — and `FormImageUpload` shows the bar for one and not the other.
     */
    it('starts idle rather than at zero', () => {
        expect(useUploadProgress().uploadProgress.value).toBeUndefined();
    });

    /**
     * The point of the whole helper: no file means no progress callback, so a plain field edit
     * does not flash the bar to 100% for a payload measured in bytes.
     */
    it('attaches no axios options at all when there is no file', () => {
        const { trackUpload } = useUploadProgress();
        const send = vi.fn().mockResolvedValue('done');

        return trackUpload(undefined, send).then(() => {
            // Called with no argument at all, which `send` reads as `options === undefined` just
            // the same — the point is that no progress callback is handed to the transport.
            expect(send).toHaveBeenCalledWith();
        });
    });

    it('attaches a progress callback when there is a file', () => {
        const { trackUpload } = useUploadProgress();
        const send = vi.fn().mockResolvedValue('done');

        return trackUpload(fileOfSize(1), send).then(() => {
            expect(progressCallbackOf(send.mock.calls[0][0])).toBeInstanceOf(Function);
        });
    });

    it('converts axios’ 0–1 fraction into a percentage while the call runs', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return trackUpload(fileOfSize(1), (options) => {
            reportProgress(options, { progress: 0.42 });
            expect(uploadProgress.value).toBe(42);
            return Promise.resolve();
        });
    });

    /**
     * `event.progress` is absent when the total size is unknown — a chunked or compressed
     * request. The bar stays at 0 instead of jumping about on a number that means nothing.
     */
    it('falls back to zero when the total size is unknown', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return trackUpload(fileOfSize(1), (options) => {
            reportProgress(options, { loaded: 1024 });
            expect(uploadProgress.value).toBe(0);
            return Promise.resolve();
        });
    });

    it('passes the result of the call straight through', () => {
        const { trackUpload } = useUploadProgress();

        return expect(trackUpload(fileOfSize(1), () => Promise.resolve('created'))).resolves.toBe(
            'created'
        );
    });

    it('returns to idle once the call resolves, not to zero', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return trackUpload(fileOfSize(1), (options) => {
            reportProgress(options, { progress: 1 });
            return Promise.resolve();
        }).then(() => {
            expect(uploadProgress.value).toBeUndefined();
        });
    });

    /**
     * The `finally` earning its keep: a failed upload must not leave the bar frozen mid-flight
     * for as long as the form stays open.
     */
    it('returns to idle when the call rejects, and re-throws', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return expect(
            trackUpload(fileOfSize(1), (options) => {
                reportProgress(options, { progress: 0.5 });
                return Promise.reject(new Error('upload failed'));
            })
        )
            .rejects.toThrow('upload failed')
            .then(() => {
                expect(uploadProgress.value).toBeUndefined();
            });
    });
});
