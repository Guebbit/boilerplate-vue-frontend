import type { AxiosRequestConfig } from 'axios';

type MockTransportHeaders = Record<string, string>;

type MockTransportOptions = {
    status?: number;
    headers?: MockTransportHeaders;
    config?: AxiosRequestConfig;
    request?: Record<string, unknown>;
};

/**
 * Builds the axios-like response envelope used by app code after interceptors.
 */
export const mockResponse = <T>(data: T, options: MockTransportOptions = {}) => ({
    data,
    status: options.status ?? 200,
    headers: options.headers ?? {},
    config: options.config ?? {},
    request: options.request ?? {}
});

/**
 * Converts domain data into the object format expected by axios-mock-adapter.
 */
export const toMockReply = <T>(data: T, options: MockTransportOptions = {}) => ({
    status: options.status ?? 200,
    data: mockResponse(data, options),
    headers: options.headers ?? {},
    config: options.config ?? {}
});
