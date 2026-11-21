/**
 * @module
 * `etag.ts` — the client half of conditional writes: remember the `ETag` a read or a write answered
 * with, send it back as `If-Match` on the next write of that resource, and forget it when an answer
 * without a tag has made it stale. A wrong answer here is either a write that never carries the
 * guard (lost update) or one that carries a tag certain to be refused (a 412 nobody caused).
 */
import { asStub } from '../../../support/stub';
import { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearEtags,
    forgetEtag,
    knownEtag,
    onEtagRequest,
    onEtagResponse
} from '@/infrastructure/http/etag.ts';

/**
 * A response the way axios hands one to a success interceptor.
 *
 * @param method - HTTP verb of the request that produced it.
 * @param url - Request URL.
 * @param etag - The `ETag` header, when the API sent one.
 * @param location - The `Content-Location` header, when the API sent one.
 */
const answered = (method: string, url: string, etag?: string, location?: string) =>
    asStub<AxiosResponse>({
        config: { method, url },
        headers: {
            ...(etag === undefined ? {} : { etag }),
            ...(location === undefined ? {} : { 'content-location': location })
        }
    });

/**
 * An outgoing request config with real axios headers, so `has`/`set` behave as in production.
 *
 * @param method - HTTP verb.
 * @param url - Request URL.
 * @param headers - Headers the caller already set.
 */
const outgoing = (method: string, url: string, headers: Record<string, string> = {}) =>
    asStub<InternalAxiosRequestConfig>({ method, url, headers: new AxiosHeaders(headers) });

/**
 * The `If-Match` a request went out with.
 */
const ifMatchOf = (config: InternalAxiosRequestConfig) => config.headers.get('If-Match');

beforeEach(clearEtags);

describe('forgetEtag', () => {
    it('drops one resource tag so its next write goes out unconditionally', () => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));
        onEtagResponse(answered('get', '/products/p2', '"200"'));

        forgetEtag('/products/p1');

        expect(knownEtag('/products/p1')).toBeUndefined();
        expect(knownEtag('/products/p2')).toBe('"200"');
    });
});

describe('onEtagResponse', () => {
    it('remembers the tag a read answered with, by the resource path without its query', () => {
        onEtagResponse(answered('get', '/products/p1?lang=it', '"100"'));

        expect(knownEtag('/products/p1')).toBe('"100"');
    });

    it('remembers the NEW tag a PATCH answered with, replacing the old one', () => {
        onEtagResponse(answered('get', '/users/u1', '"100"'));
        onEtagResponse(answered('patch', '/users/u1', '"200"'));

        expect(knownEtag('/users/u1')).toBe('"200"');
    });

    it('returns the response itself, untouched: it observes, never unwraps', () => {
        const response = answered('get', '/products/p1', '"100"');

        expect(onEtagResponse(response)).toBe(response);
    });

    it('ignores a read that carries no tag', () => {
        onEtagResponse(answered('get', '/products/p1'));

        expect(knownEtag('/products/p1')).toBeUndefined();
    });

    it('forgets a resource an action without a tag just changed', () => {
        onEtagResponse(answered('get', '/orders/o1', '"100"'));

        onEtagResponse(answered('post', '/orders/o1/cancel'));

        expect(knownEtag('/orders/o1')).toBeUndefined();
    });

    it('keeps another resource whose id merely starts the same', () => {
        onEtagResponse(answered('get', '/orders/o10', '"100"'));

        onEtagResponse(answered('post', '/orders/o1/cancel'));

        expect(knownEtag('/orders/o10')).toBe('"100"');
    });

    it('forgets a resource once it was deleted', () => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));

        onEtagResponse(answered('delete', '/products/p1'));

        expect(knownEtag('/products/p1')).toBeUndefined();
    });

    it('does not take a tag from an action answer that names no record', () => {
        onEtagResponse(answered('post', '/products/p1/restore', '"999"'));

        expect(knownEtag('/products/p1')).toBeUndefined();
    });

    it('keeps the new tag of a held record an action answer names by Content-Location', () => {
        onEtagResponse(answered('get', '/orders/o1', '"100"'));

        onEtagResponse(answered('post', '/orders/o1/cancel', '"200"', '/orders/o1'));

        expect(knownEtag('/orders/o1')).toBe('"200"');
    });

    it('reads a Content-Location that is an absolute URL by its path', () => {
        onEtagResponse(answered('get', '/users/u1', '"100"'));

        onEtagResponse(
            answered('post', '/users/u1/activate', '"200"', 'https://api.example.com/users/u1')
        );

        expect(knownEtag('/users/u1')).toBe('"200"');
    });

    it('ignores the tag of an action answer whose Content-Location names a record not held', () => {
        onEtagResponse(answered('post', '/orders/o1/cancel', '"200"', '/orders/o1'));

        expect(knownEtag('/orders/o1')).toBeUndefined();
    });

    it('drops the held tag when an action answers a Content-Location but no tag', () => {
        onEtagResponse(answered('get', '/orders/o1', '"100"'));

        onEtagResponse(answered('post', '/orders/o1/cancel', undefined, '/orders/o1'));

        expect(knownEtag('/orders/o1')).toBeUndefined();
    });

    it('takes no tag from a PUT or a DELETE that names a held record by Content-Location', () => {
        onEtagResponse(answered('get', '/orders/o1', '"100"'));
        onEtagResponse(answered('get', '/webhooks/subscriptions/s1', '"300"'));

        onEtagResponse(answered('put', '/orders/o1/shipping-address', '"200"', '/orders/o1'));
        onEtagResponse(
            answered(
                'delete',
                '/webhooks/subscriptions/s1/secrets/k1',
                '"400"',
                '/webhooks/subscriptions/s1'
            )
        );

        expect(knownEtag('/orders/o1')).toBeUndefined();
        expect(knownEtag('/webhooks/subscriptions/s1')).toBeUndefined();
    });
});

/**
 * The writes that move a held record and answer with no tag. Each drops the tag, so the next save
 * goes out unconditionally unless the caller reads the record again first (the store does, and
 * a plain GET then hands the new tag back).
 */
describe('a write that moves a held record and answers without a tag', () => {
    it.each([
        ['an address PUT', 'put', '/orders/o1/shipping-address', '/orders/o1'],
        ['a billing address PUT', 'put', '/orders/o1/billing-address', '/orders/o1'],
        ['a payment', 'post', '/orders/o1/payments', '/orders/o1'],
        ['an order note', 'post', '/orders/o1/timeline/notes', '/orders/o1'],
        ['a withdrawn note', 'delete', '/orders/o1/timeline/notes/e1', '/orders/o1'],
        [
            'a secret DELETE',
            'delete',
            '/webhooks/subscriptions/s1/secrets/k1',
            '/webhooks/subscriptions/s1'
        ],
        ['an account sub-action', 'post', '/account/email-change/resend', '/account']
    ])(
        '%s drops the tag, and the next read hands the new one back',
        (_name, method, path, held) => {
            onEtagResponse(answered('get', held, '"100"'));

            onEtagResponse(answered(method, path));
            expect(knownEtag(held)).toBeUndefined();
            expect(ifMatchOf(onEtagRequest(outgoing('patch', held)))).toBeUndefined();

            onEtagResponse(answered('get', held, '"200"'));
            expect(ifMatchOf(onEtagRequest(outgoing('patch', held)))).toBe('"200"');
        }
    );
});

describe('onEtagRequest', () => {
    it.each(['put', 'patch', 'PATCH'])('sends the known tag as If-Match on a %s', (method) => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));

        expect(ifMatchOf(onEtagRequest(outgoing(method, '/products/p1')))).toBe('"100"');
    });

    it('sends no If-Match on a DELETE, even for a resource whose tag is known', () => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));

        expect(ifMatchOf(onEtagRequest(outgoing('delete', '/products/p1')))).toBeUndefined();
    });

    it('sends nothing on a read or a POST', () => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));

        expect(ifMatchOf(onEtagRequest(outgoing('get', '/products/p1')))).toBeUndefined();
        expect(ifMatchOf(onEtagRequest(outgoing('post', '/products/p1')))).toBeUndefined();
    });

    it('sends nothing for a resource never read here: the write stays unconditional', () => {
        expect(ifMatchOf(onEtagRequest(outgoing('patch', '/products/p9')))).toBeUndefined();
    });

    it('keeps an If-Match the caller set itself', () => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));

        const config = onEtagRequest(outgoing('patch', '/products/p1', { 'If-Match': '"mine"' }));

        expect(ifMatchOf(config)).toBe('"mine"');
    });

    it('matches an absolute request URL by its path', () => {
        onEtagResponse(answered('get', '/users/u1', '"100"'));

        const config = onEtagRequest(outgoing('patch', 'https://api.example.com/users/u1'));

        expect(ifMatchOf(config)).toBe('"100"');
    });
});

describe('clearEtags', () => {
    it('drops every held tag, so the next person on this browser inherits none', () => {
        onEtagResponse(answered('get', '/products/p1', '"100"'));
        onEtagResponse(answered('get', '/users/u1', '"200"'));

        clearEtags();

        expect(knownEtag('/products/p1')).toBeUndefined();
        expect(knownEtag('/users/u1')).toBeUndefined();
    });
});
