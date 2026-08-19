import { delay, HttpResponse } from 'msw';
import type { ZodType } from 'zod';
import { assertMockContract } from './mockValidation.ts';

type MockTransportHeaders = Record<string, string>;

interface MockTransportOptions {
    status?: number;
    headers?: MockTransportHeaders;
    delayMs?: number;
    // Zod schema (from '@api/schemas', generated off openapi.yaml) the payload must satisfy.
    // Optional only because a few endpoints (binary/PDF, SSE, Prometheus text) have no JSON
    // schema to check against — every JSON-returning handler should pass one.
    schema?: ZodType;
}

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

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the type parameter keeps the call site checked against the envelope it claims to send
export const toMockJsonResponse = <T>(data: T, options: MockTransportOptions = {}) => {
    // Send what was validated, not what was passed in. The two are the same object for a
    // conforming payload, but keeping the parse result is what makes the guard honest: calling the
    // validator only for its exception would let a stray key through under a schema that strips
    // rather than rejects.
    // The schemas are generated with `strict`, so an undeclared key throws here (see orval.config.ts).
    const payload = options.schema ? assertMockContract(options.schema, data) : data;
    return delay(options.delayMs ?? 250).then(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- msw's JsonBodyType rejects the validated envelope's unknowns; the zod parse above is the real check
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
