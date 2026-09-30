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
 */
const answered = (method: string, url: string, etag?: string) =>
    asStub<AxiosResponse>({
        config: { method, url },
        headers: etag === undefined ? {} : { etag }
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

describe('onEtagResponse', () => {
    it('remembers the tag a read answered with, by the resource path without its query', () => {
        onEtagResponse(answered('get', '/products/p1?lang=it', '"100"'));

        expect(knownEtag('/products/p1')).toBe('"100"');
    });

    it('remembers the NEW tag a PUT or PATCH answered with, replacing the old one', () => {
        onEtagResponse(answered('get', '/users/u1', '"100"'));
        onEtagResponse(answered('patch', '/users/u1', '"200"'));
        onEtagResponse(answered('put', '/users/u1', '"300"'));

        expect(knownEtag('/users/u1')).toBe('"300"');
    });

    it('treats the editor read and the hard-delete spelling as the same resource', () => {
        onEtagResponse(answered('get', '/products/p1/admin', '"100"'));

        expect(knownEtag('/products/p1')).toBe('"100"');
        expect(knownEtag('/products/p1/hard')).toBe('"100"');
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

    it('does not take a tag from an action answer, even one that carries a header', () => {
        onEtagResponse(answered('post', '/products/p1/restore', '"999"'));

        expect(knownEtag('/products/p1')).toBeUndefined();
    });
});

describe('onEtagRequest', () => {
    it.each(['put', 'patch', 'delete', 'PATCH'])(
        'sends the known tag as If-Match on a %s',
        (method) => {
            onEtagResponse(answered('get', '/products/p1/admin', '"100"'));

            expect(ifMatchOf(onEtagRequest(outgoing(method, '/products/p1')))).toBe('"100"');
        }
    );

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

    it('sends the hard-delete request the tag of its resource', () => {
        onEtagResponse(answered('get', '/users/u1', '"100"'));

        expect(ifMatchOf(onEtagRequest(outgoing('delete', '/users/u1/hard')))).toBe('"100"');
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
