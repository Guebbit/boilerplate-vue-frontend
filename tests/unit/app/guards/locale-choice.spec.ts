/**
 * Locale router guard — `src/app/guards/locale-choice.ts`.
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
 * test rather than by whichever files happen to sit in `src/locales/` — the suite must not change
 * meaning the day a translation is added.
 */

import { asStub } from '../../../support/stub';
import * as schemas from '@api/schemas';
import { contractResponse } from '../../infrastructure/http/orval-fixture-schema.ts';
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

vi.mock('@/i18n', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
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

/**
 * The API's locale endpoints. Mocked at the network boundary rather than by stubbing
 * `withLocaleOverrides`, so the merge itself — bundled dictionary first, edited overrides on top,
 * per key — is exercised by the assertions below instead of being replaced by them.
 */
const getLocalesMock = vi.fn(() =>
    Promise.resolve(
        contractResponse(schemas.GetLocalesResponse, { locales: [], default: 'en', fallback: 'en' })
    )
);
const getLocaleMessagesMock = vi.fn((_locale: string) =>
    Promise.resolve(
        contractResponse(schemas.GetLocaleMessagesResponse, {
            locale: 'it',
            revision: 1,
            messages: { greeting: 'from-the-database' }
        })
    )
);

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    getLocales: () => getLocalesMock(),
    getLocaleMessages: (locale: string) => getLocaleMessagesMock(locale)
}));

const { fetchLanguageApi, localeChoice } = await import('@/app/guards/locale-choice');

/** Minimal route stub — the guard only reads name, params and query. */
const routeTo = (overrides: Partial<RouteLocationNormalized> = {}) =>
    asStub<RouteLocationNormalized>({
        name: 'home',
        params: {},
        query: {},
        ...overrides
    });

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
        return fetchLanguageApi('kl').then((result) => {
            expect(result).toEqual(['kl', {}]);
            // Supported by neither side, so nothing is imported AND nothing is fetched.
            expect(getLocaleMessagesMock).not.toHaveBeenCalled();
        });
    });

    it('loads a supported locale and returns its dictionary', () => {
        return fetchLanguageApi('en').then(([locale, dictionary]) => {
            expect(locale).toBe('en');
            // Real file, real import: asserting it is a non-empty object proves the dynamic import
            // actually resolved rather than falling into the catch branch.
            expect(Object.keys(dictionary).length).toBeGreaterThan(0);
        });
    });

    /**
     * The case the whole override tier exists for. `es` is supported and has no
     * `src/locales/es.json`, so the bundled import rejects — and that must resolve to an empty
     * dictionary rather than reject, since callers have no `.catch`. What comes back is the
     * overrides alone, and every key they do not carry is left for `fallbackLocale`: degrading
     * key by key rather than all-or-nothing.
     */
    it('is the overrides alone when this build bundles no dictionary for the locale', () => {
        return fetchLanguageApi('es').then((result) => {
            expect(result).toEqual(['es', { greeting: 'from-the-database' }]);
            expect(getLocaleMessagesMock).toHaveBeenCalledWith('es');
        });
    });

    it('never rejects when the overrides cannot be fetched', () => {
        getLocaleMessagesMock.mockRejectedValueOnce(new Error('network down'));
        return fetchLanguageApi('it').then(([locale, dictionary]) => {
            // The bundled half still loaded. A dead API costs the edits and nothing else — it
            // must never strand a navigation or blank the interface.
            expect(locale).toBe('it');
            expect(dictionary.navigation).toBeDefined();
            expect(Object.keys(dictionary).length).toBeGreaterThan(1);
        });
    });

    it('lets an override win over the bundled string, without dropping its siblings', () => {
        // `navigation` is deliberately a namespace the SHARED dictionary owns and fills. Editing
        // ONE of its keys must not cost the others, which is the difference between a deep merge
        // and an assign — and the failure would surface on an unrelated screen.
        getLocaleMessagesMock.mockResolvedValueOnce(
            contractResponse(schemas.GetLocaleMessagesResponse, {
                locale: 'it',
                revision: 1,
                messages: { navigation: { ['error-already-logged']: 'EDITED' } }
            })
        );
        return fetchLanguageApi('it').then(([, dictionary]) => {
            const navigation = dictionary.navigation as Record<string, string>;

            expect(navigation['error-already-logged']).toBe('EDITED');
            expect(Object.keys(navigation).length).toBeGreaterThan(1);
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
        return localeChoice(routeTo({ params: { locale: 'it' } })).then((result) => {
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

    /**
     * The regression FA26 fixes: a switch to `it` was still in flight (fetching its dictionary)
     * when the visitor navigated again to `es`. `es` has nothing slowing it down and activates
     * first; `it` finishing afterwards must not un-switch the page back to a language the visitor
     * already left. Only the LATEST requested locale may ever activate.
     */
    it('a switch overtaken by another navigation does not activate the abandoned language', () => {
        i18nState.loadedLanguages = [];
        i18nState.supportedLanguages = ['en', 'it', 'es'];

        // `import('@/locales/it.json')` is a REAL dynamic import, whose timing is not
        // deterministic relative to `es`'s (which rejects instantly, having no file). So this
        // does not just release a promise on `es` settling — it waits until `it`'s own chain has
        // actually reached (and is blocked on) the overrides fetch, THEN lets `es` win, THEN
        // releases `it` to prove the now-abandoned chain still doesn't activate.
        const itOverrides = Promise.withResolvers<ReturnType<typeof contractResponse>>();
        const itRequested = Promise.withResolvers<undefined>();
        getLocaleMessagesMock.mockImplementation((locale: string) => {
            if (locale === 'it') {
                itRequested.resolve(undefined);
                return itOverrides.promise;
            }
            return Promise.resolve(
                contractResponse(schemas.GetLocaleMessagesResponse, {
                    locale,
                    revision: 1,
                    messages: {}
                })
            );
        });

        const itPromise = localeChoice(routeTo({ params: { locale: 'it' } }));
        const esPromise = localeChoice(routeTo({ params: { locale: 'es' } }));

        return itRequested.promise
            .then(() => esPromise)
            .then(() => {
                expect(changeLanguageMock).toHaveBeenCalledWith('es');
                changeLanguageMock.mockClear();
                itOverrides.resolve(
                    contractResponse(schemas.GetLocaleMessagesResponse, {
                        locale: 'it',
                        revision: 1,
                        messages: {}
                    })
                );
                return itPromise;
            })
            .then(() => {
                // The dictionary can still finish registering — only ACTIVATING is guarded.
                expect(changeLanguageMock).not.toHaveBeenCalled();
            })
            .finally(() => {
                // Restore the shared mock's default behaviour for every test after this one.
                getLocaleMessagesMock.mockImplementation((_locale: string) =>
                    Promise.resolve(
                        contractResponse(schemas.GetLocaleMessagesResponse, {
                            locale: 'it',
                            revision: 1,
                            messages: { greeting: 'from-the-database' }
                        })
                    )
                );
            });
    });
});
