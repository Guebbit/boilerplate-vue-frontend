/**
 * @module
 * This app's one Axios wiring for `@guebbit/vue-toolkit`'s upload-progress tracker —
 * repeated identically across every form that submits a picked file (avatar, product image),
 * until this composable was the one place it lived.
 */
import { useUploadProgress as useToolkitUploadProgress } from '@guebbit/vue-toolkit';
import type { Ref } from 'vue';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

/**
 * The progress bar a caller binds to, and the one call that both drives it and only tracks when
 * a file is actually attached.
 */
export interface AxiosUploadProgress {
    /**
     * 0–1 fraction while a tracked call is in flight; the toolkit's own idle value otherwise.
     * Bound straight onto `FormImageUpload`'s `progress` prop.
     */
    progress: Ref<number | undefined>;
    /**
     * Runs `send` with progress tracking attached, but only when `file` is present — a save with
     * nothing to upload has no bar to show.
     *
     * @param file - The picked file, or `undefined` when nothing was picked.
     * @param send - The API call to run, given the tracked request config to forward.
     * @returns Whatever `send` resolves with.
     */
    trackUpload: <T>(
        file: File | undefined,
        send: (options?: AxiosRequestConfig) => Promise<T>
    ) => Promise<T>;
}

/**
 * Wires the toolkit's tracker to this app's Axios client: a 0–1 `progress` fraction fed from
 * `AxiosProgressEvent`, and `trackUpload` in place of the toolkit's own `track` + a hand-written
 * `enabled: !!file` at every call site.
 *
 * @returns The bar to bind, and the call that drives it.
 */
export const useAxiosUploadProgress = (): AxiosUploadProgress => {
    const { progress, track } = useToolkitUploadProgress<AxiosRequestConfig>((onProgress) => ({
        // `event.progress` is a 0–1 fraction, absent when the total size is unknown (a chunked or
        // compressed request) — reporting 0 keeps the bar still rather than jumping about.
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.progress ?? 0)
    }));

    const trackUpload = <T>(
        file: File | undefined,
        send: (options?: AxiosRequestConfig) => Promise<T>
    ) => track(send, { enabled: !!file });

    return { progress, trackUpload };
};
