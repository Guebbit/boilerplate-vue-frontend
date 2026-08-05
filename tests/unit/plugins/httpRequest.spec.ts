/**
 * Request interceptor and refresh-exclusion list — `src/plugins/http/index.ts`.
 *
 * Two pieces of that module that the existing specs reach only incidentally:
 *
 *   `onRequest` — attaches the bearer token and the active language to every outgoing request.
 *   Failing to attach the token logs the user out from the API's point of view while the UI
 *   still believes they are signed in; failing to attach the language silently serves every
 *   response in the fallback locale.
 *
 *   `refreshExcludedPaths` — the set of auth endpoints that must NOT trigger the 401 → refresh →
 *   replay flow. A 401 from `/account/login` means "wrong password", so attempting a refresh
 *   there turns a clean error message into an extra round trip and, when the refresh also fails,
 *   a misleading session-expired state. `httpRefresh.spec.ts` asserts this for login; the whole
 *   list is asserted here, because each entry is a separate one-line omission.
 *
 * The list is private, so it is exercised through its observable effect: whether
 * `onResponseRejectWithRefresh` attempts a refresh for a 401 on that path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const accessToken = ref<string | undefined>(undefined);
const setAccessTokenMock = vi.fn();

vi.mock('@/stores/profile', () => ({
    useProfileStore: () => ({ setAccessToken: setAccessTokenMock })
}));

vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal<typeof import('pinia')>()),
    storeToRefs: () => ({ accessToken })
}));

vi.mock('@/utils/i18n.ts', () => ({
    getCurrentLocale: () => 'it',
    i18n: { global: { t: (key: string) => key } }
}));

const { onRequest, onRequestReject, onResponseRejectWithRefresh, getAccessToken } =
    await import('@/plugins/http');

/** Minimal outgoing config — `onRequest` only writes to `headers`. */
const makeConfig = () => ({ headers: {} }) as unknown as InternalAxiosRequestConfig<unknown>;

/** A 401 AxiosError for the given request url. */
const make401 = (url: string) =>
    ({
        config: { url, headers: {} },
        response: { status: 401, data: {}, headers: {} },
        isAxiosError: true,
        message: 'Request failed with status code 401'
    }) as unknown as AxiosError;

beforeEach(() => {
    accessToken.value = undefined;
    vi.clearAllMocks();
});

describe('getAccessToken', () => {
    it('reads the token off the profile store', () => {
        accessToken.value = 'abc.def.ghi';

        expect(getAccessToken()).toBe('abc.def.ghi');
    });

    it('is undefined when nobody is signed in', () => {
        expect(getAccessToken()).toBeUndefined();
    });
});

describe('onRequest', () => {
    it('attaches the bearer token when authenticated', () => {
        accessToken.value = 'abc.def.ghi';

        const config = onRequest(makeConfig());

        // The `Bearer ` prefix is not decoration: the backend's `getTokenBearer` splits on a
        // space and takes index 1, so a bare token resolves to undefined and reads as anonymous.
        expect(config.headers.Authorization).toBe('Bearer abc.def.ghi');
    });

    it('omits the Authorization header entirely when anonymous', () => {
        const config = onRequest(makeConfig());

        // Absent, not `Bearer undefined` — the latter is a malformed credential that some
        // servers answer 400 to rather than treating as anonymous.
        expect(config.headers.Authorization).toBeUndefined();
    });

    it('omits the header for an empty-string token', () => {
        accessToken.value = '';

        expect(onRequest(makeConfig()).headers.Authorization).toBeUndefined();
    });

    it('always sends the active language', () => {
        const config = onRequest(makeConfig());

        expect(config.headers['Accept-Language']).toBe('it');
    });

    it('sends the language even when anonymous', () => {
        // Public pages are localised too; tying the header to authentication would serve every
        // logged-out visitor the fallback locale.
        accessToken.value = undefined;

        expect(onRequest(makeConfig()).headers['Accept-Language']).toBe('it');
    });

    it('returns the same config object it was given', () => {
        const config = makeConfig();

        expect(onRequest(config)).toBe(config);
    });
});

describe('onRequestReject', () => {
    it('forwards a setup failure untouched', async () => {
        const error = { message: 'Network Error' } as AxiosError;

        await expect(onRequestReject(error)).rejects.toBe(error);
    });
});

describe('refresh exclusion list', () => {
    /**
     * Drives a 401 through the refresh interceptor and reports whether a refresh was attempted.
     * A refresh attempt reaches the profile store via `setAccessToken`; an excluded path must
     * reject without ever getting there.
     */
    const attemptedRefresh = async (url: string) => {
        setAccessTokenMock.mockClear();
        await onResponseRejectWithRefresh(make401(url)).catch(() => {});
        return setAccessTokenMock.mock.calls.length > 0;
    };

    it.each([
        ['/account/login'],
        ['/account/signup'],
        ['/account/reset'],
        ['/account/reset-confirm'],
        ['/account/logout-all']
    ])('does not attempt a refresh for a 401 from %s', async (url) => {
        // Each of these answers 401 as a normal business outcome — wrong password, expired reset
        // link, already-invalidated session. Refreshing would mask the real message.
        await expect(attemptedRefresh(url)).resolves.toBe(false);
    });

    it('recognises an excluded path given as an absolute url', async () => {
        // Generated clients send relative urls, but a caller passing an absolute one must get
        // the same treatment — otherwise the exclusion silently stops applying.
        await expect(attemptedRefresh('https://api.example.com/account/login')).resolves.toBe(
            false
        );
    });
});
