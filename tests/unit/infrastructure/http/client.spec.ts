/**
 * The shared axios instance's configuration — `src/infrastructure/http/client.ts`.
 *
 * Both defaults are read from the environment at import time and both have a fallback, which is
 * exactly the shape that goes wrong silently: a missing `VITE_API_URL` that resolved to
 * `undefined` would make every relative call hit the dev server instead of the API, and a
 * missing timeout would make a hung request hang forever. So each arm is loaded on its own.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Imports the client fresh, so the module-scope env reads run again.
 *
 * @param environment - Variables to stub before the import; anything omitted is unset.
 * @returns The freshly imported module.
 */
const loadClient = (environment: Record<string, string | undefined>) => {
    vi.resetModules();
    for (const [key, value] of Object.entries(environment))
        if (value === undefined) vi.stubEnv(key, undefined);
        else vi.stubEnv(key, value);
    return import('@/infrastructure/http/client.ts');
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('axios instance defaults', () => {
    it('takes the base URL and timeout from the environment', () => {
        return loadClient({ VITE_API_URL: 'http://api.test', VITE_AXIOS_TIMEOUT: '2500' }).then(
            ({ instance }) => {
                expect(instance.defaults.baseURL).toBe('http://api.test');
                expect(instance.defaults.timeout).toBe(2500);
            }
        );
    });

    it('falls back to same-origin relative calls and a ten second timeout', () => {
        return loadClient({ VITE_API_URL: undefined, VITE_AXIOS_TIMEOUT: undefined }).then(
            ({ instance }) => {
                // Empty string, not undefined: axios treats an undefined baseURL as "no prefix",
                // which is the same result by accident rather than by decision.
                expect(instance.defaults.baseURL).toBe('');
                expect(instance.defaults.timeout).toBe(10_000);
            }
        );
    });

    it('sends credentials, so the httpOnly refresh cookie travels with every call', () => {
        return loadClient({}).then(({ instance }) => {
            expect(instance.defaults.withCredentials).toBe(true);
        });
    });
});
