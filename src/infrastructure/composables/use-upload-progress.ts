import { useUploadProgress as useToolkitUploadProgress } from '@guebbit/vue-toolkit';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

/**
 * Progress state for one form's image upload, and the wrapper that drives it.
 *
 * The state machine is the toolkit's — bar appears with the request, returns to idle however it
 * ends, nothing tracked when there is no file. All this adds is the axios binding, which lives
 * here once instead of in each of the five forms that upload.
 *
 * @returns `uploadProgress`, `undefined` while idle and 0–100 during a request, and
 *  {@link trackUpload} to wrap the call itself.
 */
export const useUploadProgress = () => {
    const { progress, track } = useToolkitUploadProgress<AxiosRequestConfig>((onProgress) => ({
        // `event.progress` is a 0–1 fraction, absent when the total size is unknown (a chunked or
        // compressed request) — reporting 0 keeps the bar still rather than jumping about.
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.progress ?? 0)
    }));

    /**
     * Runs an API call with upload progress attached, and returns to idle however it ends.
     *
     * @param file - The picked file, or `undefined`. When absent nothing is tracked at all: on a
     *  plain field edit the bar would otherwise flash to 100% for a payload measured in bytes.
     * @param send - Performs the call. Receives the axios overrides to forward to the store
     *  method's `options` parameter, which is `undefined` when there is no file.
     * @returns Whatever `send` resolves with, untouched.
     */
    const trackUpload = <T>(
        file: File | undefined,
        send: (options?: AxiosRequestConfig) => Promise<T>
    ) => track(send, { enabled: !!file });

    return { uploadProgress: progress, trackUpload };
};
