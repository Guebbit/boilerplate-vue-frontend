import type { AxiosResponse } from 'axios';
import type { IResponseReject } from '@/types';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isResponseReject = (value: unknown): value is IResponseReject =>
    isObjectRecord(value) &&
    typeof value.success === 'boolean' &&
    typeof value.status === 'number' &&
    typeof value.message === 'string' &&
    Array.isArray(value.errors);

export const unwrapResponseData = <T>(value: { data?: T } | T): T | undefined =>
    isObjectRecord(value)
        ? 'data' in value
            ? (value as { data?: T }).data
            : (value as T)
        : (value as T);

export const normalizeResponseSuccess = (
    response: AxiosResponse,
    apiMockEnabled: boolean
): AxiosResponse | AxiosResponse['data'] => (apiMockEnabled ? response : response.data);

export const normalizeResponseReject = (
    data: unknown,
    status: number | undefined,
    apiMockEnabled: boolean
): IResponseReject | undefined => {
    if (isResponseReject(data)) return data;

    if (apiMockEnabled && isObjectRecord(data)) {
        const nestedError = isObjectRecord(data.error) ? data.error : undefined;
        const message =
            typeof nestedError?.message === 'string'
                ? nestedError.message
                : typeof data.message === 'string'
                  ? data.message
                  : 'Unknown error';
        return {
            success: false,
            status: status ?? 500,
            message,
            errors: [message]
        };
    }
};
