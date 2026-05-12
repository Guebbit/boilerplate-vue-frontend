import { delay, HttpResponse } from 'msw';

type MockTransportHeaders = Record<string, string>;

type MockTransportOptions = {
    status?: number;
    headers?: MockTransportHeaders;
    delayMs?: number;
};

/**
 * Builds the axios-like response envelope used by app code after interceptors.
 */
export const mockResponse = <T>(data: T, options: MockTransportOptions = {}) => ({
    data,
    status: options.status ?? 200,
    headers: options.headers ?? {},
    config: {},
    request: {}
});

export const toMockJsonResponse = async <T extends Record<string, unknown> | unknown[]>(data: T, options: MockTransportOptions = {}) => {
    await delay(options.delayMs ?? 250);
    return HttpResponse.json(data, {
        status: options.status ?? 200,
        headers: options.headers ?? {}
    });
};

export const toMockArrayBufferResponse = async (
    data: ArrayBuffer,
    options: MockTransportOptions = {}
) => {
    await delay(options.delayMs ?? 250);
    return HttpResponse.arrayBuffer(data, {
        status: options.status ?? 200,
        headers: options.headers ?? {}
    });
};
