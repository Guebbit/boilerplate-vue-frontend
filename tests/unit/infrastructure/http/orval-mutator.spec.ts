/**
 * `orvalMutator`'s own header merge — `src/infrastructure/http/index.ts`'s
 * `{ ...options?.headers, ...config.headers }`. Nothing else exercises it directly:
 * every other spec either mocks `orvalMutator` outright or drives it through MSW without ever
 * handing it BOTH a generated `config` and a caller `options` with overlapping header keys, so
 * nothing proves the merge picks `config` over `options` — the precedence antibot's antibot token
 * and the upload progress path both depend on (see the function's own docblock: "a top-level merge
 * would drop the caller's headers... including the multipart boundary").
 *
 * `instance.request` is spied rather than driven through MSW: what is under test is the object
 * `orvalMutator` BUILDS before axios ever sends it, not the network call itself.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { asStub } from '../../../support/stub';
import { instance } from '@/infrastructure/http/client.ts';
import { orvalMutator } from '@/infrastructure/http/index.ts';

/** A minimal stand-in for what axios echoes back — `orvalMutator` reads only `.data`. */
const okResponse = (data: unknown): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: asStub<InternalAxiosRequestConfig>({})
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('orvalMutator', () => {
    it("keeps the caller's own option headers alongside the generated config's", () => {
        const request = vi.spyOn(instance, 'request').mockResolvedValue(okResponse(undefined));

        return orvalMutator(
            { url: '/products', method: 'get', headers: { 'X-Generated': 'yes' } },
            { headers: { 'X-Caller-Option': 'yes' } }
        ).then(() => {
            const sent = request.mock.calls[0]?.[0];
            expect(sent?.headers).toMatchObject({
                'X-Generated': 'yes',
                'X-Caller-Option': 'yes'
            });
        });
    });

    it("lets the generated config's header win over the caller option's, for the same key", () => {
        const request = vi.spyOn(instance, 'request').mockResolvedValue(okResponse(undefined));

        return orvalMutator(
            { url: '/products', method: 'post', headers: { 'Content-Type': 'application/json' } },
            { headers: { 'Content-Type': 'multipart/form-data' } }
        ).then(() => {
            const sent = request.mock.calls[0]?.[0];
            expect(sent?.headers).toMatchObject({ 'Content-Type': 'application/json' });
        });
    });

    it('merges non-header options and config, config winning on conflict', () => {
        const request = vi.spyOn(instance, 'request').mockResolvedValue(okResponse(undefined));

        return orvalMutator(
            { url: '/products', method: 'get' },
            { signal: new AbortController().signal, timeout: 1000 }
        ).then(() => {
            const sent = request.mock.calls[0]?.[0];
            expect(sent?.url).toBe('/products');
            expect(sent?.timeout).toBe(1000);
        });
    });

    it('resolves with the unwrapped response body, not the whole axios response', () => {
        vi.spyOn(instance, 'request').mockResolvedValue(okResponse({ id: 'p1' }));

        return expect(orvalMutator({ url: '/products/p1', method: 'get' })).resolves.toEqual({
            id: 'p1'
        });
    });
});
