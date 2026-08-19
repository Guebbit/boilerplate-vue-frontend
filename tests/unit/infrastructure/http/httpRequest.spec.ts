/**
 * The request interceptor of `src/infrastructure/http/index.ts`.
 *
 * `onRequest` attaches the bearer token and the active language to every outgoing request.
 * Failing to attach the token logs the user out from the API's point of view while the UI still
 * believes they are signed in; failing to attach the language silently serves every response in
 * the fallback locale.
 *
 * The refresh-exclusion list is covered in `httpRefresh.spec.ts`, which drives the real
 * interceptor chain against MSW and asserts on the server's own request log.
 */

import { asStub } from '../../../support/stub';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const accessToken = ref<string | undefined>(undefined);

vi.mock('@/infrastructure/stores/session', () => ({
    useSessionStore: () => ({})
}));

vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal<typeof import('pinia')>()),
    storeToRefs: () => ({ accessToken })
}));

// `translate` is not decoration here: `onResponseReject` calls it to build the 401 message, so a
// mock without it throws before the refresh logic is ever reached.
vi.mock('@/infrastructure/i18n', () => ({
    getCurrentLocale: () => 'it',
    translate: (key: string) => key,
    i18n: { global: { t: (key: string) => key } }
}));

const { onRequest, onRequestReject, getAccessToken } = await import('@/infrastructure/http');

/** Minimal outgoing config — `onRequest` only writes to `headers`. */
const makeConfig = () => asStub<InternalAxiosRequestConfig<unknown>>({ headers: {} });

beforeEach(() => {
    accessToken.value = undefined;
    vi.clearAllMocks();
});

describe('getAccessToken', () => {
    it('reads the token off the session store', () => {
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
    it('forwards a setup failure untouched', () => {
        const error = { message: 'Network Error' } as AxiosError;

        return expect(onRequestReject(error)).rejects.toBe(error);
    });
});
