/**
 * An array query parameter goes out the way the contract declares it.
 *
 * Risk:    the contract says `?id=a&id=b` (`style: form, explode: true`) and the backend refuses
 *          anything else as an unknown field. axios' own default is `?id[]=a&id[]=b`, so a client
 *          that mocks the transport passes every unit test while the real request is a 422.
 * Asserts: the URL the REAL generated client builds for an array parameter, read off the request
 *          axios hands its adapter.
 * Real:    the generated `listProductAvailability` and the shared axios instance with its defaults.
 * Double:  the adapter, which captures the request instead of sending it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { listProductAvailability } from '@api';
import { instance } from '@/infrastructure/http/client.ts';

const originalAdapter = instance.defaults.adapter;

afterEach(() => {
    instance.defaults.adapter = originalAdapter;
});

/**
 * Runs a call through the instance and answers the URL it would have requested.
 *
 * @param call - the generated client call to make
 */
const urlOf = (call: () => Promise<unknown>): Promise<string> => {
    let requested = '';
    instance.defaults.adapter = (config: InternalAxiosRequestConfig) => {
        requested = instance.getUri(config);
        return Promise.resolve({
            data: { items: [] },
            status: 200,
            statusText: 'OK',
            headers: {},
            config
        });
    };
    return call().then(() => requested);
};

describe('an array query parameter', () => {
    it('repeats the key, without brackets, as the contract declares and the backend reads', async () => {
        const url = await urlOf(() => listProductAvailability({ id: ['a', 'b'] }));

        expect(url).toContain('/products/availability?id=a&id=b');
        expect(url).not.toContain('%5B');
    });
});
