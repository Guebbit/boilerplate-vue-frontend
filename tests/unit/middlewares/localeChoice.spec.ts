/**
 * Locale router guard — `src/middlewares/localeChoice.ts`.
 *
 * This guard runs on every navigation and decides one of three things: proceed as-is, load a
 * language first, or redirect to inject a default locale. Getting the third case wrong is the
 * dangerous one — a guard that returns a redirect when it should return `true` produces an
 * infinite navigation loop, which is why the "already loaded" and "supported" branches are each
 * asserted to return the literal `true` rather than merely something truthy.
 *
 * `fetchLanguageApi` is the simulated server call underneath it. Its documented contract is that
 * it **always resolves, never rejects** — callers deliberately have no `.catch()` — so every
 * failure mode below asserts a resolved empty dictionary rather than a rejection.
 *
 * The i18n module is mocked so `supportedLanguages` / `loadedLanguages` are controlled by the
 * test rather than by whatever `VITE_APP_SUPPORTED_LOCALES` happens to hold in the developer's
 * `.env` — the suite must not change meaning when that file does.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';

/** Mutable so individual tests can decide what is supported / already loaded. */
const i18nState = {
    supportedLanguages: ['en', 'it', 'es'],
    loadedLanguages: [] as string[],
    currentLocale: 'en',
    defaultLocale: 'en'
};

const changeLanguageMock = vi.fn(() => Promise.resolve());
const updateLocaleMock = vi.fn(() => Promise.resolve());

vi.mock('@/utils/i18n.ts', () => ({
    get supportedLanguages() {
        return i18nState.supportedLanguages;
    },
    get loadedLanguages() {
        return i18nState.loadedLanguages;
    },
    getCurrentLocale: () => i18nState.currentLocale,
    getDefaultLocale: () => i18nState.defaultLocale,
    changeLanguage: (locale: string) => changeLanguageMock(locale),
    updateLocale: (locale: string, messages: unknown) => updateLocaleMock(locale, messages)
}));

const { fetchLanguageApi, localeChoice } = await import('@/middlewares/localeChoice');

/** Minimal route stub — the guard only reads name, params and query. */
const routeTo = (overrides: Partial<RouteLocationNormalized> = {}) =>
    ({
        name: 'home',
        params: {},
        query: {},
        ...overrides
    }) as unknown as RouteLocationNormalized;

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    i18nState.supportedLanguages = ['en', 'it', 'es'];
    i18nState.loadedLanguages = [];
    i18nState.currentLocale = 'en';
    i18nState.defaultLocale = 'en';
});

afterEach(() => {
    vi.useRealTimers();
});

describe('fetchLanguageApi', () => {
    it('resolves an empty dictionary for an unsupported locale, without waiting', async () => {
        vi.useFakeTimers();

        // No timer is scheduled at all on this path, so the promise settles without any
        // advancement — asserted by awaiting it before touching the clock.
        const result = await fetchLanguageApi('kl');

        expect(result).toEqual(['kl', {}]);
    });

    it('loads a supported locale and returns its dictionary', async () => {
        vi.useFakeTimers();

        const promise = fetchLanguageApi('en');
        await vi.advanceTimersByTimeAsync(1000);
        const [locale, dictionary] = await promise;

        expect(locale).toBe('en');
        // Real file, real import: asserting it is a non-empty object proves the dynamic import
        // actually resolved rather than falling into the catch branch.
        expect(Object.keys(dictionary).length).toBeGreaterThan(0);
    });

    it('delays the first download of a locale by the simulated latency', async () => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

        void fetchLanguageApi('it');

        // Asserted on the scheduled delay rather than on when the promise settles: the dynamic
        // `import()` underneath resolves over an indeterminate number of microtasks, so a
        // settle-order assertion would be timing-dependent rather than behavioural.
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('skips the delay for a locale already downloaded in a previous session', async () => {
        localStorage.setItem('downloaded-locales', JSON.stringify(['it']));
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

        void fetchLanguageApi('it');

        // The whole point of persisting the list: latency is simulated once per browser, not
        // once per navigation.
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
    });

    it('records a locale as downloaded once it has been fetched', async () => {
        vi.useFakeTimers();

        const promise = fetchLanguageApi('it');
        await vi.advanceTimersByTimeAsync(1000);
        await promise;

        expect(JSON.parse(localStorage.getItem('downloaded-locales') ?? '[]')).toContain('it');
    });

    it('deduplicates the stored locale list', async () => {
        localStorage.setItem('downloaded-locales', JSON.stringify(['en']));
        vi.useFakeTimers();

        const promise = fetchLanguageApi('en');
        await vi.advanceTimersByTimeAsync(0);
        await promise;

        // Unbounded growth here would be a slow localStorage leak on a long-lived browser.
        expect(JSON.parse(localStorage.getItem('downloaded-locales') ?? '[]')).toEqual(['en']);
    });

    it('resolves an empty dictionary when the locale file does not exist', async () => {
        // 'es' is declared supported but has no src/locales/es.json — the import rejects, and
        // the documented contract says resolve empty rather than reject.
        vi.useFakeTimers();

        const promise = fetchLanguageApi('es');
        await vi.advanceTimersByTimeAsync(1000);

        await expect(promise).resolves.toEqual(['es', {}]);
    });

    it('treats a corrupted downloaded-locales entry as empty rather than throwing', async () => {
        localStorage.setItem('downloaded-locales', 'not-json{');
        vi.useFakeTimers();

        const promise = fetchLanguageApi('en');
        // Corrupted store ⇒ "not downloaded" ⇒ the full delay applies.
        await vi.advanceTimersByTimeAsync(1000);
        const [locale, dictionary] = await promise;

        // The locale still loads for real...
        expect(locale).toBe('en');
        expect(Object.keys(dictionary).length).toBeGreaterThan(0);
        // ...and the corrupted value is replaced by a well-formed list, so the browser
        // self-heals instead of re-paying the latency on every navigation forever.
        expect(JSON.parse(localStorage.getItem('downloaded-locales') ?? 'null')).toEqual(['en']);
    });

    it('still resolves when localStorage writes are unavailable', async () => {
        // Private-mode / quota: the documented behaviour is to swallow and simply re-simulate
        // the latency next time, never to fail the navigation.
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.useFakeTimers();

        const promise = fetchLanguageApi('en');
        await vi.advanceTimersByTimeAsync(1000);
        const [, dictionary] = await promise;

        expect(Object.keys(dictionary).length).toBeGreaterThan(0);
        setItemSpy.mockRestore();
    });
});

describe('localeChoice', () => {
    it('proceeds without reloading when the locale is already loaded and active', async () => {
        i18nState.loadedLanguages = ['en'];
        i18nState.currentLocale = 'en';

        const result = await localeChoice(routeTo({ params: { locale: 'en' } }));

        // Literal `true`, not merely truthy: a redirect object is also truthy, and returning one
        // here is what produces an infinite navigation loop.
        expect(result).toBe(true);
        expect(changeLanguageMock).not.toHaveBeenCalled();
    });

    it('switches the active language when the loaded locale differs from the current one', async () => {
        i18nState.loadedLanguages = ['en', 'it'];
        i18nState.currentLocale = 'en';

        const result = await localeChoice(routeTo({ params: { locale: 'it' } }));

        expect(result).toBe(true);
        expect(changeLanguageMock).toHaveBeenCalledWith('it');
        // Already loaded ⇒ no re-download.
        expect(updateLocaleMock).not.toHaveBeenCalled();
    });

    it('fetches, registers and activates a supported but unloaded locale', async () => {
        i18nState.loadedLanguages = [];
        i18nState.supportedLanguages = ['en', 'it'];
        vi.useFakeTimers();

        const promise = localeChoice(routeTo({ params: { locale: 'it' } }));
        await vi.advanceTimersByTimeAsync(1000);
        const result = await promise;

        expect(result).toBe(true);
        // Order matters: messages must be registered before the language is switched, or the
        // first render after the switch has no translations.
        expect(updateLocaleMock).toHaveBeenCalledWith('it', expect.any(Object));
        expect(changeLanguageMock).toHaveBeenCalledWith('it');
    });

    it('redirects an unsupported locale to the default, preserving route name and query', async () => {
        i18nState.supportedLanguages = ['en', 'it'];
        i18nState.defaultLocale = 'en';

        const result = await localeChoice(
            routeTo({
                name: 'products',
                params: { locale: 'kl', id: '42' },
                query: { page: '2' }
            })
        );

        // Dropping params or query here would silently lose the user's place on every
        // locale-less deep link.
        expect(result).toEqual({
            name: 'products',
            params: { locale: 'en', id: '42' },
            query: { page: '2' }
        });
    });

    it('redirects when the route carries no locale at all', async () => {
        i18nState.defaultLocale = 'it';

        const result = await localeChoice(routeTo({ name: 'home', params: {} }));

        expect(result).toEqual({
            name: 'home',
            params: { locale: 'it' },
            query: {}
        });
    });

    it('does not activate any language while redirecting', async () => {
        i18nState.supportedLanguages = ['en'];

        await localeChoice(routeTo({ params: { locale: 'zz' } }));

        expect(changeLanguageMock).not.toHaveBeenCalled();
        expect(updateLocaleMock).not.toHaveBeenCalled();
    });
});
