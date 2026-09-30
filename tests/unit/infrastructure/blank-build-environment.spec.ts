/**
 * @module
 * A `VITE_*` line left blank in `.env` reaches the code as `''`, not `undefined`. Each read below
 * chains a default after it, and `??` would let the `''` through: a `NaN` request timeout, a blank
 * locale, a blank empty-value glyph. The reads use `||`, so a blank line means "not set".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Imports a module fresh, with the given build variables stubbed, so its module-scope reads run again.
 *
 * @param environment - Build variables to stub, by name.
 * @param load - The import to run once they are stubbed.
 * @returns Whatever the import resolves to.
 */
const loadWith = <T>(environment: Record<string, string>, load: () => Promise<T>): Promise<T> => {
    vi.resetModules();
    for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
    return load();
};

afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(globalThis, '__APP_CONFIG');
});

describe('a blank build variable is treated as unset', () => {
    it('keeps a ten second request timeout and a same-origin base URL', () =>
        loadWith(
            { VITE_AXIOS_TIMEOUT: '', VITE_API_URL: '' },
            () => import('@/infrastructure/http/client.ts')
        ).then(({ instance }) => {
            expect(instance.defaults.timeout).toBe(10_000);
            expect(instance.defaults.baseURL).toBe('');
        }));

    it('keeps the em dash as the empty-value glyph', () =>
        loadWith(
            { VITE_APP_EMPTY_VALUE: '' },
            () => import('@/infrastructure/utils/formatters.ts')
        ).then((formatters) => {
            expect(formatters.EMPTY_VALUE).toBe('—');
        }));

    it('keeps English as the default and fallback locale', () =>
        loadWith(
            { VITE_APP_DEFAULT_LOCALE: '', VITE_APP_FALLBACK_LOCALE: '' },
            () => import('@/i18n')
        ).then(({ i18n }) => {
            expect(i18n.global.locale.value).toBe('en');
            expect(i18n.global.fallbackLocale.value).toBe('en');
        }));

    it('keeps the demo tenant for the locale overrides', () =>
        loadWith(
            { VITE_LOCALE_TENANT: '' },
            () => import('@/infrastructure/locale-overrides.ts')
        ).then(({ localeTenant }) => {
            expect(localeTenant()).toBe('demo-fe');
        }));
});
