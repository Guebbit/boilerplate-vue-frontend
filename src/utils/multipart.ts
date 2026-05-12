import type { IResponseSuccess } from '@/types';

type IDataResponse<T> = { data: T };
type IEnvelopeResponse<T> = { data: IResponseSuccess<T> };

const isSuccessEnvelope = <T>(value: unknown): value is IResponseSuccess<T> =>
    typeof value === 'object' && value !== null && 'success' in value;

/**
 * Converts a plain payload object into browser `FormData`, skipping nullish values
 * and appending arrays as repeated fields under the same key.
 *
 * @template T Payload object shape to serialize as multipart data.
 * @param payload Source object that may contain strings, numbers, booleans, blobs/files, or arrays of them.
 * @returns A `FormData` instance ready for multipart HTTP requests.
 */
export const toMultipartFormData = <T extends object>(payload: T): FormData => {
    const formData = new FormData();

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item === undefined || item === null) continue;
                formData.append(key, item instanceof Blob ? item : String(item));
            }
            continue;
        }

        formData.append(key, value instanceof Blob ? value : String(value));
    }

    return formData;
};

export const unwrapApiPayload = <T>(
    response: IDataResponse<T> | IEnvelopeResponse<T>
): T | undefined => {
    const payload = response.data;
    return isSuccessEnvelope<T>(payload) ? payload.data : payload;
};

export const withOptionalMultipartUpload = <TRequest extends { imageUpload?: Blob }, TResponse>(
    payload: TRequest,
    options: {
        sendMultipart: (formData: FormData) => Promise<TResponse>;
        sendJson: () => Promise<TResponse>;
    }
): Promise<TResponse> =>
    payload.imageUpload
        ? options.sendMultipart(toMultipartFormData(payload))
        : options.sendJson();
