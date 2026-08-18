/**
 * Locale router guard — `src/app/guards/localeChoice.ts`.
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

// Parameters are declared even though the bodies ignore them: `vi.fn(() => ...)` infers a
// zero-arity signature, so the call sites below (and `toHaveBeenCalledWith`) would not type-check.
const changeLanguageMock = vi.fn((_locale: string) => Promise.resolve());
const updateLocaleMock = vi.fn((_locale: string, _messages: unknown) => Promise.resolve());

vi.mock('@/infrastructure/i18n', () => ({
    get supportedLanguages() {
        return i18nState.supportedLanguages;
    },
    get loadedLanguages() {
        return i18nState.loadedLanguages;
    },
    getCurrentLocale: () => i18nState.currentLocale,
    getDefaultLocale: () => i18nState.defaultLocale,
    changeLanguage: (locale: string) => changeLanguageMock(locale),
    updateLocale: (locale: string, messages: unknown) => updateLocaleMock(locale, messages),
    API_NAMESPACE: 'api'
}));

/**
 * The API's dictionary endpoints. Mocked at the network boundary rather than by stubbing
 * `withApiDictionary`, so the merge itself — this app's keys at the root, the API's under
 * `api.*` — is exercised by the assertions below instead of being replaced by them.
 */
const getLocalesMock = vi.fn(() => Promise.resolve({ data: { locales: ['en', 'it', 'es'] } }));
const getLocaleDictionaryMock = vi.fn(
    (_locale: string): Promise<{ data?: { messages?: Record<string, unknown> } }> =>
        Promise.resolve({ data: { messages: { greeting: 'from-the-api' } } })
);

vi.mock('@api', () => ({
    getLocales: () => getLocalesMock(),
    getLocaleDictionary: (locale: string) => getLocaleDictionaryMock(locale)
}));

const { fetchLanguageApi, localeChoice } = await import('@/app/guards/localeChoice');

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
    it('resolves an empty dictionary for an unsupported locale, without waiting', () => {
        vi.useFakeTimers();

        // No timer is scheduled at all on this path, so the promise settles without any
        // advancement — asserted by resolving it before touching the clock.
        return fetchLanguageApi('kl').then((result) => {
            expect(result).toEqual(['kl', {}]);
            // Supported by neither side, so nothing is imported AND nothing is fetched.
            expect(getLocaleDictionaryMock).not.toHaveBeenCalled();
        });
    });

    it('loads a supported locale and returns its dictionary', () => {
        vi.useFakeTimers();
        const promise = fetchLanguageApi('en');
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return promise;
            })
            .then(([locale, dictionary]) => {
                expect(locale).toBe('en');
                // Real file, real import: asserting it is a non-empty object proves the dynamic import
                // actually resolved rather than falling into the catch branch.
                expect(Object.keys(dictionary).length).toBeGreaterThan(0);
            });
    });

    it('delays the first download of a locale by the simulated latency', () => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

        void fetchLanguageApi('it');

        // Asserted on the scheduled delay rather than on when the promise settles: the dynamic
        // `import()` underneath resolves over an indeterminate number of microtasks, so a
        // settle-order assertion would be timing-dependent rather than behavioural.
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('skips the delay for a locale already downloaded in a previous session', () => {
        localStorage.setItem('downloaded-locales', JSON.stringify(['it']));
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

        void fetchLanguageApi('it');

        // The whole point of persisting the list: latency is simulated once per browser, not
        // once per navigation.
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);
    });

    it('records a locale as downloaded once it has been fetched', () => {
        vi.useFakeTimers();
        const promise = fetchLanguageApi('it');
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return promise;
            })
            .then(() => {
                expect(JSON.parse(localStorage.getItem('downloaded-locales') ?? '[]')).toContain(
                    'it'
                );
            });
    });

    it('deduplicates the stored locale list', () => {
        localStorage.setItem('downloaded-locales', JSON.stringify(['en']));
        vi.useFakeTimers();
        const promise = fetchLanguageApi('en');
        return vi
            .advanceTimersByTimeAsync(0)
            .then(() => {
                return promise;
            })
            .then(() => {
                // Unbounded growth here would be a slow localStorage leak on a long-lived browser.
                expect(JSON.parse(localStorage.getItem('downloaded-locales') ?? '[]')).toEqual([
                    'en'
                ]);
            });
    });

    /**
     * The degradation design C is built around. `es` is supported and has no
     * `src/locales/es.json`, so the UI import rejects — and that must resolve to an empty UI
     * dictionary rather than reject, since callers have no `.catch`. The API's own copy is
     * fetched regardless, so the result is Spanish API messages inside a UI that falls back per
     * key: degrading key by key rather than all-or-nothing.
     */
    it('resolves API copy with an empty UI dictionary when the locale file does not exist', () => {
        vi.useFakeTimers();
        const promise = fetchLanguageApi('es');
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return expect(promise).resolves.toEqual([
                    'es',
                    { api: { greeting: 'from-the-api' } }
                ]);
            })
            .then(() => {
                expect(getLocaleDictionaryMock).toHaveBeenCalledWith('es');
            });
    });

    it('never rejects when the API dictionary cannot be fetched', () => {
        getLocaleDictionaryMock.mockRejectedValueOnce(new Error('network down'));
        vi.useFakeTimers();
        const promise = fetchLanguageApi('it');
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return promise;
            })
            .then(([locale, dictionary]) => {
                // The UI half still loaded; only `api.*` is empty. A dead API must never strand a
                // navigation or blank the interface.
                expect(locale).toBe('it');
                expect(dictionary.api).toEqual({});
                expect(Object.keys(dictionary).length).toBeGreaterThan(1);
            });
    });

    it('puts the API dictionary under api.* and never at the root', () => {
        // `navigation` is deliberately a namespace the SHARED dictionary owns. The module
        // dictionaries are not loaded here, so colliding on a module-owned namespace would prove
        // nothing — the root key would be absent whether or not the reserved namespace worked.
        getLocaleDictionaryMock.mockResolvedValueOnce({
            data: { messages: { navigation: { ['error-already-logged']: 'API COPY' } } }
        });
        vi.useFakeTimers();
        const promise = fetchLanguageApi('it');
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return promise;
            })
            .then(([, dictionary]) => {
                // The API's `navigation` key is namespaced, so it cannot shadow this app's own —
                // which is the collision the reserved namespace exists to prevent.
                expect(dictionary.api).toEqual({
                    navigation: { ['error-already-logged']: 'API COPY' }
                });
                expect(
                    (dictionary.navigation as Record<string, string>)['error-already-logged']
                ).not.toBe('API COPY');
            });
    });

    it('treats a corrupted downloaded-locales entry as empty rather than throwing', () => {
        localStorage.setItem('downloaded-locales', 'not-json{');
        vi.useFakeTimers();

        const promise = fetchLanguageApi('en');
        // Corrupted store ⇒ "not downloaded" ⇒ the full delay applies.
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => promise)
            .then(([locale, dictionary]) => {
                // The locale still loads for real...
                expect(locale).toBe('en');
                expect(Object.keys(dictionary).length).toBeGreaterThan(0);
                // ...and the corrupted value is replaced by a well-formed list, so the browser
                // self-heals instead of re-paying the latency on every navigation forever.
                expect(JSON.parse(localStorage.getItem('downloaded-locales') ?? 'null')).toEqual([
                    'en'
                ]);
            });
    });

    it('still resolves when localStorage writes are unavailable', () => {
        // Private-mode / quota: the documented behaviour is to swallow and simply re-simulate
        // the latency next time, never to fail the navigation.
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.useFakeTimers();
        const promise = fetchLanguageApi('en');
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return promise;
            })
            .then(([, dictionary]) => {
                expect(Object.keys(dictionary).length).toBeGreaterThan(0);
                setItemSpy.mockRestore();
            });
    });
});

describe('localeChoice', () => {
    it('proceeds without reloading when the locale is already loaded and active', () => {
        i18nState.loadedLanguages = ['en'];
        i18nState.currentLocale = 'en';
        return localeChoice(routeTo({ params: { locale: 'en' } })).then((result) => {
            // Literal `true`, not merely truthy: a redirect object is also truthy, and returning one
            // here is what produces an infinite navigation loop.
            expect(result).toBe(true);
            expect(changeLanguageMock).not.toHaveBeenCalled();
        });
    });

    it('switches the active language when the loaded locale differs from the current one', () => {
        i18nState.loadedLanguages = ['en', 'it'];
        i18nState.currentLocale = 'en';
        return localeChoice(routeTo({ params: { locale: 'it' } })).then((result) => {
            expect(result).toBe(true);
            expect(changeLanguageMock).toHaveBeenCalledWith('it');
            // Already loaded ⇒ no re-download.
            expect(updateLocaleMock).not.toHaveBeenCalled();
        });
    });

    it('fetches, registers and activates a supported but unloaded locale', () => {
        i18nState.loadedLanguages = [];
        i18nState.supportedLanguages = ['en', 'it'];
        vi.useFakeTimers();
        const promise = localeChoice(routeTo({ params: { locale: 'it' } }));
        return vi
            .advanceTimersByTimeAsync(1000)
            .then(() => {
                return promise;
            })
            .then((result) => {
                expect(result).toBe(true);
                // Order matters: messages must be registered before the language is switched, or the
                // first render after the switch has no translations.
                expect(updateLocaleMock).toHaveBeenCalledWith('it', expect.any(Object));
                expect(changeLanguageMock).toHaveBeenCalledWith('it');
            });
    });

    it('redirects an unsupported locale to the default, preserving route name and query', () => {
        i18nState.supportedLanguages = ['en', 'it'];
        i18nState.defaultLocale = 'en';
        return localeChoice(
            routeTo({
                name: 'products',
                params: { locale: 'kl', id: '42' },
                query: { page: '2' }
            })
        ).then((result) => {
            // Dropping params or query here would silently lose the user's place on every
            // locale-less deep link.
            expect(result).toEqual({
                name: 'products',
                params: { locale: 'en', id: '42' },
                query: { page: '2' }
            });
        });
    });

    it('redirects when the route carries no locale at all', () => {
        i18nState.defaultLocale = 'it';
        return localeChoice(routeTo({ name: 'home', params: {} })).then((result) => {
            expect(result).toEqual({
                name: 'home',
                params: { locale: 'it' },
                query: {}
            });
        });
    });

    it('does not activate any language while redirecting', () => {
        i18nState.supportedLanguages = ['en'];
        return localeChoice(routeTo({ params: { locale: 'zz' } })).then(() => {
            expect(changeLanguageMock).not.toHaveBeenCalled();
            expect(updateLocaleMock).not.toHaveBeenCalled();
        });
    });
});
