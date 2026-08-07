import { delay, HttpResponse } from 'msw';
import type { ZodType } from 'zod';
import { assertMockContract } from './mockValidation.ts';

type MockTransportHeaders = Record<string, string>;

type MockTransportOptions = {
    status?: number;
    headers?: MockTransportHeaders;
    delayMs?: number;
    // Zod schema (from '@api/schemas', generated off openapi.yaml) the payload must satisfy.
    // Optional only because a few endpoints (binary/PDF, SSE, Prometheus text) have no JSON
    // schema to check against — every JSON-returning handler should pass one.
    schema?: ZodType;
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

export const toMockJsonResponse = <T>(data: T, options: MockTransportOptions = {}) => {
    // Send what was validated, not what was passed in. The two are the same object for a
    // conforming payload, but keeping the parse result is what makes the guard honest: previously
    // this called the validator for its exception and then shipped the original, so a schema that
    // stripped rather than rejected would have let the stray key through anyway.
    // The schemas are generated with `strict`, so an undeclared key throws here (see orval.config.ts).
    const payload = options.schema ? assertMockContract(options.schema, data) : data;
    return delay(options.delayMs ?? 250).then(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        HttpResponse.json(payload as any, {
            status: options.status ?? 200,
            headers: options.headers ?? {}
        })
    );
};

export const toMockArrayBufferResponse = (data: ArrayBuffer, options: MockTransportOptions = {}) =>
    delay(options.delayMs ?? 250).then(() =>
        HttpResponse.arrayBuffer(data, {
            status: options.status ?? 200,
            headers: options.headers ?? {}
        })
    );
