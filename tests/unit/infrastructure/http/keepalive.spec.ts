/**
 * `sendKeepalive` — the one request a page may still make while it is being closed. It must be a
 * `fetch` with `keepalive` (axios dies with the page), carry the bearer token — or, in `cookie`
 * mode, only the cookie — and stay silent for a signed-out caller, whose request could only be a 401.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { sendKeepalive } from '@/infrastructure/http/keepalive.ts';
import { instance } from '@/infrastructure/http/client.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

/** Stub for `fetch`, answering 200 to every ping. */
const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(new Response(null, { status: 200 }))
);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('fetch', fetchMock);
    instance.defaults.baseURL = 'http://api.test';
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('sendKeepalive', () => {
    it('sends a keepalive fetch to the API base, with the bearer token and the JSON body', () => {
        useSessionStore().accessToken = 'tok-123';

        sendKeepalive('PUT', '/cart/p1', { quantity: 3 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('http://api.test/cart/p1');
        expect(init.method).toBe('PUT');
        expect(init.keepalive).toBe(true);
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
        expect(init.body).toBe(JSON.stringify({ quantity: 3 }));
    });

    it('in cookie mode, sends no bearer and lets the browser carry the session cookie', () => {
        const session = useSessionStore();
        session.mode = 'cookie';
        session.startCookieSession();

        sendKeepalive('PUT', '/cart/p1', { quantity: 3 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0];
        expect(init.credentials).toBe('include');
        // `fetch`'s `HeadersInit` is a union; `sendKeepalive` always passes a plain record.
        expect(init.headers as Record<string, string>).not.toHaveProperty('Authorization');
    });

    it('sends nothing when nobody is signed in', () => {
        sendKeepalive('PUT', '/cart/p1', { quantity: 3 });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('swallows a failed send: nobody is left to read it', () => {
        useSessionStore().accessToken = 'tok-123';
        fetchMock.mockReturnValueOnce(Promise.reject(new Error('gone')));

        expect(() => sendKeepalive('PUT', '/cart/p1', { quantity: 3 })).not.toThrow();
    });
});
