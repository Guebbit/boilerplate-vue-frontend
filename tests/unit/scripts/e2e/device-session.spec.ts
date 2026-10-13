/**
 * `scripts/e2e/device-session.ts` — a second device that keeps its own session cookie, in either
 * session mode.
 *
 * `fetch` is stubbed with hand-built responses: what matters is what the device DOES with the
 * answer (which cookie it keeps, when its token rotates), not the network.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    deviceLogin,
    deviceRefresh,
    deviceRequest,
    sessionCookieFrom,
    type Device
} from '../../../../scripts/e2e/device-session';

/** A response carrying the given JSON body and `Set-Cookie` lines. */
const answer = (status: number, body: unknown, cookies: string[] = []): Response => {
    const headers = new Headers();
    for (const cookie of cookies) headers.append('Set-Cookie', cookie);
    return new Response(body === null ? null : JSON.stringify(body), { status, headers });
};

/** What the stub was called with, in order. */
const stubFetch = (...responses: Response[]) => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const queue = [...responses];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return Promise.resolve(queue.shift()!);
    });
    return calls;
};

/** `GET /account/session-config`'s answer for the given mode. */
const modeAnswer = (mode: 'jwt' | 'cookie') => answer(200, { data: { mode } });

/** A `jwt`-mode device: an access token and a refresh cookie. */
const device: Device = {
    apiUrl: 'http://api.test',
    mode: 'jwt',
    token: 'access-1',
    cookie: '__Host-session=refresh-1'
};

/** A `cookie`-mode device: the cookie is the whole credential, there is no token. */
const cookieDevice: Device = {
    apiUrl: 'http://api.test',
    mode: 'cookie',
    token: '',
    cookie: '__Host-session=ses_abc'
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('sessionCookieFrom', () => {
    it('reads the __Host-session cookie out of several Set-Cookie headers, attributes dropped', () => {
        const headers = new Headers();
        headers.append('Set-Cookie', 'isAuth=true; Path=/');
        headers.append('Set-Cookie', '__Host-session=abc.def; Path=/; HttpOnly; Max-Age=60');

        expect(sessionCookieFrom(headers)).toBe('__Host-session=abc.def');
    });

    it('answers null when no cookie was set, and when it was cleared', () => {
        expect(sessionCookieFrom(new Headers())).toBeNull();

        const cleared = new Headers();
        cleared.append(
            'Set-Cookie',
            '__Host-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        );
        expect(sessionCookieFrom(cleared)).toBeNull();
    });
});

describe('deviceLogin', () => {
    it('keeps the access token and the refresh cookie the login issued', async () => {
        stubFetch(
            modeAnswer('jwt'),
            answer(200, { data: { token: 'access-1' } }, ['__Host-session=refresh-1; Path=/'])
        );

        await expect(
            deviceLogin({ apiUrl: 'http://api.test', email: 'a@b.c', password: 'pw' })
        ).resolves.toEqual(device);
    });

    it('in cookie mode keeps the session cookie and no token: the body carries none', async () => {
        stubFetch(
            modeAnswer('cookie'),
            answer(200, { data: {} }, ['__Host-session=ses_abc; Path=/'])
        );

        await expect(
            deviceLogin({ apiUrl: 'http://api.test', email: 'a@b.c', password: 'pw' })
        ).resolves.toEqual(cookieDevice);
    });

    it('throws when the deployment names no known session mode', async () => {
        stubFetch(answer(200, { data: { mode: 'other' } }));

        await expect(
            deviceLogin({ apiUrl: 'http://api.test', email: 'a@b.c', password: 'pw' })
        ).rejects.toThrow('no known mode');
    });

    it('throws when the login is refused', async () => {
        stubFetch(modeAnswer('jwt'), answer(401, { message: 'no' }));

        await expect(
            deviceLogin({ apiUrl: 'http://api.test', email: 'a@b.c', password: 'pw' })
        ).rejects.toThrow('a@b.c got 401');
    });

    it('throws when a two-factor challenge came back instead of a token', async () => {
        stubFetch(
            modeAnswer('jwt'),
            answer(200, { data: { mfaRequired: true } }, ['__Host-session=x'])
        );

        await expect(
            deviceLogin({ apiUrl: 'http://api.test', email: 'a@b.c', password: 'pw' })
        ).rejects.toThrow('no token');
    });
});

describe('deviceRefresh', () => {
    it('sends its own cookie and becomes the rotated device', async () => {
        const calls = stubFetch(
            answer(200, { data: { token: 'access-2' } }, ['__Host-session=refresh-2; Path=/'])
        );

        const refreshed = await deviceRefresh(device);

        expect(calls[0].url).toBe('http://api.test/account/refresh');
        expect(calls[0].init?.headers).toEqual({ Cookie: '__Host-session=refresh-1' });
        expect(refreshed.status).toBe(200);
        expect(refreshed.device).toEqual({
            ...device,
            token: 'access-2',
            cookie: '__Host-session=refresh-2'
        });
    });

    it('in cookie mode asks GET /account instead: there is no refresh endpoint', async () => {
        const calls = stubFetch(answer(200, { data: { id: 'u1' } }));

        const refreshed = await deviceRefresh(cookieDevice);

        expect(calls[0].url).toBe('http://api.test/account');
        expect(calls[0].init).toMatchObject({ method: 'GET' });
        expect(calls[0].init?.headers).toEqual({ Cookie: '__Host-session=ses_abc' });
        expect(refreshed.device).toEqual(cookieDevice);
    });

    it('in cookie mode answers 401 once the session was revoked', async () => {
        stubFetch(answer(401, { message: 'revoked' }));

        await expect(deviceRefresh(cookieDevice)).resolves.toMatchObject({ status: 401 });
    });

    it('returns a refused refresh as an answer, the device unchanged', async () => {
        stubFetch(answer(401, { message: 'revoked' }));

        const refreshed = await deviceRefresh(device);

        expect(refreshed.status).toBe(401);
        expect(refreshed.device).toEqual(device);
    });
});

describe('deviceRequest', () => {
    it('carries the bearer token and the cookie, and a JSON body', async () => {
        const calls = stubFetch(answer(200, { ok: true }));

        const result = await deviceRequest({
            device,
            method: 'POST',
            path: '/account/logout-all',
            body: { why: 'test' }
        });

        expect(calls[0].url).toBe('http://api.test/account/logout-all');
        expect(calls[0].init?.headers).toMatchObject({
            Authorization: 'Bearer access-1',
            Cookie: '__Host-session=refresh-1'
        });
        expect(calls[0].init?.body).toBe('{"why":"test"}');
        expect(result).toEqual({ status: 200, body: { ok: true }, device });
    });

    it('sends no Authorization header in cookie mode, only the cookie', async () => {
        const calls = stubFetch(answer(200, { ok: true }));

        await deviceRequest({ device: cookieDevice, method: 'GET', path: '/account' });

        expect(calls[0].init?.headers).toEqual({
            'Content-Type': 'application/json',
            Cookie: '__Host-session=ses_abc'
        });
    });

    it('answers a non-2xx and an empty body as data, not a throw', async () => {
        stubFetch(answer(204, null));
        await expect(
            deviceRequest({ device, method: 'DELETE', path: '/x' })
        ).resolves.toMatchObject({ status: 204, body: null });

        stubFetch(answer(403, { message: 'no' }));
        await expect(deviceRequest({ device, method: 'GET', path: '/x' })).resolves.toMatchObject({
            status: 403
        });
    });

    it('reads a body that is not JSON as no body', async () => {
        stubFetch(new Response('<html>bad gateway</html>', { status: 502 }));

        await expect(deviceRequest({ device, method: 'GET', path: '/x' })).resolves.toMatchObject({
            status: 502,
            body: null
        });
    });
});
