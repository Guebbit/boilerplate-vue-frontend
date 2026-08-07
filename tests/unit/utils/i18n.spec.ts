import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import type { ITranslationDictionaries } from '@/utils/i18n.ts';
import {
    API_NAMESPACE,
    apiText,
    getCurrentLocale,
    getDefaultLocale,
    loadedLanguages,
    routerLinkI18n,
    supportedLanguages,
    _changeLanguage,
    _ensureFallbackLoaded,
    _loadLocale,
    _updateLocale,
    i18n
} from '@/utils/i18n.ts';
import enMessages from '@/locales/en.json';
import itMessages from '@/locales/it.json';

/**
 * The locale machinery itself, against a REAL vue-i18n instance.
 *
 * This layer had no test at all. The one locale spec that existed —
 * `tests/unit/middlewares/localeChoice.spec.ts` — mocks `@/utils/i18n.ts` wholesale, so it
 * asserts that `changeLanguage` *was called with* `'it'` and never that anything became Italian.
 * That is the right way to test a router guard, and it left everything underneath unverified.
 *
 * The `_`-prefixed functions take the instance to act on, which is exactly so a test can use a
 * throwaway one instead of mutating the app-wide singleton. `supportedLanguages` and
 * `loadedLanguages` are module state shared with that singleton, so anything touching them is
 * restored afterwards.
 */

const freshInstance = () => createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en' });

/** Restores `loadedLanguages` to whatever it held before a test pushed to it. */
const withLoadedLanguagesRestored = () => {
    const snapshot = [...loadedLanguages];
    return () => loadedLanguages.splice(0, Number.POSITIVE_INFINITY, ...snapshot);
};

describe('supportedLanguages', () => {
    it('comes from VITE_APP_SUPPORTED_LOCALES', () => {
        expect(supportedLanguages).toContain('en');
        expect(supportedLanguages).toContain('it');
    });

    /**
     * The whole point of the supported/loaded split: a locale can be offered before its
     * dictionary is anywhere near the bundle. `es` is declared in `.env` and has no
     * `src/locales/es.json`, which is the case the runtime fetch exists for.
     */
    it('may list a locale with no local dictionary', () => {
        expect(supportedLanguages).toContain('es');
    });
});

describe('_loadLocale', () => {
    let restore: () => void;

    beforeEach(() => {
        restore = withLoadedLanguagesRestored();
    });
    afterEach(() => restore());

    it('imports and activates a supported locale that is not loaded yet', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.locale.value).toBe('it');
            expect(loadedLanguages).toContain('it');
            expect(instance.global.t('users-form.email-invalid')).toBe(
                itMessages['users-form']['email-invalid']
            );
        });
    });

    it('short-circuits when the locale is already loaded', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0, Number.POSITIVE_INFINITY, 'it');
        // Registered by hand rather than imported: if the short circuit is broken and the real
        // file is fetched, this sentinel is overwritten and the assertion fails.
        instance.global.setLocaleMessage('it', { sentinel: 'not-from-the-file' });
        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.t('sentinel')).toBe('not-from-the-file');
            expect(instance.global.locale.value).toBe('it');
        });
    });

    it('falls back to the default locale for an unsupported one', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        return _loadLocale(instance, 'kl').then(() => {
            expect(instance.global.locale.value).toBe(getDefaultLocale());
        });
    });

    /**
     * `es` is supported but has no file, so the dynamic import rejects. The documented contract
     * is that this degrades to the default locale rather than rejecting: callers have no
     * `.catch`, and a failed dictionary must never strand a navigation.
     */
    it('falls back to the default locale when the import fails', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        return expect(_loadLocale(instance, 'es'))
            .resolves.not.toThrow()
            .then(() => {
                expect(instance.global.locale.value).toBe(getDefaultLocale());
            });
    });
});

describe('_updateLocale', () => {
    let restore: () => void;

    beforeEach(() => {
        restore = withLoadedLanguagesRestored();
    });
    afterEach(() => restore());

    it('registers a dictionary fetched from somewhere other than the bundle', () => {
        const instance = freshInstance();
        return _updateLocale(instance, 'es', { greeting: 'Hola' }).then(() => {
            instance.global.locale.value = 'es';
            expect(instance.global.t('greeting')).toBe('Hola');
            expect(loadedLanguages).toContain('es');
        });
    });

    it('overwrites an existing dictionary without duplicating the loaded entry', () => {
        const instance = freshInstance();
        return _updateLocale(instance, 'es', { greeting: 'Hola' })
            .then(() => {
                return _updateLocale(instance, 'es', { greeting: 'Buenas' });
            })
            .then(() => {
                instance.global.locale.value = 'es';
                expect(instance.global.t('greeting')).toBe('Buenas');
                expect(loadedLanguages.filter((locale) => locale === 'es')).toHaveLength(1);
            });
    });
});

describe('_changeLanguage', () => {
    let restore: () => void;

    beforeEach(() => {
        restore = withLoadedLanguagesRestored();
    });
    afterEach(() => restore());

    /**
     * `<html lang>` is not decoration: it tells screen readers which pronunciation rules to use
     * and browsers whether to offer a translation. Nothing else in the app sets it.
     */
    it('keeps <html lang> in sync', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0, Number.POSITIVE_INFINITY, 'it');
        return _changeLanguage(instance, 'it').then(() => {
            expect(document.documentElement.getAttribute('lang')).toBe('it');
        });
    });

    /**
     * `fallbackLocale` is inert unless the fallback's messages are registered. Landing directly
     * on a locale this app has no dictionary for used to leave EVERY UI key rendering as its own
     * raw identifier, because only that locale had been loaded and there was nothing to fall
     * back to.
     */
    it('loads the fallback dictionary too, so per-key fallback actually works', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);

        // A locale with no local dictionary — the API-only case.
        return _updateLocale(instance, 'es', { api: { greeting: 'Hola' } })
            .then(() => _changeLanguage(instance, 'es'))
            .then(() => {
                expect(instance.global.locale.value).toBe('es');
                expect(loadedLanguages).toContain('en');
                // Falls through to the English copy rather than echoing the key back.
                expect(instance.global.t('users-form.email-invalid')).toBe(
                    enMessages['users-form']['email-invalid']
                );
            });
    });

    it('does not try to load the fallback when it is the locale being activated', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0, Number.POSITIVE_INFINITY, 'en');
        return expect(_ensureFallbackLoaded(instance, 'en')).resolves.toBeUndefined();
    });

    it('loads the dictionary first when the locale has never been loaded', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        return _changeLanguage(instance, 'it').then(() => {
            expect(instance.global.locale.value).toBe('it');
            expect(instance.global.t('users-form.email-invalid')).toBe(
                itMessages['users-form']['email-invalid']
            );
        });
    });
});

describe('getDefaultLocale', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('uses the browser language when it is supported', () => {
        vi.stubGlobal('navigator', { language: 'it-IT' });
        expect(getDefaultLocale()).toBe('it');
    });

    it('falls back when the browser language is not supported', () => {
        vi.stubGlobal('navigator', { language: 'kl-GL' });
        expect(getDefaultLocale()).toBe('en');
    });

    /**
     * The check is against SUPPORTED, not loaded, languages. On a first visit nothing is loaded
     * yet, so a `loadedLanguages` check would never match and browser detection would be dead
     * code that always returned the fallback.
     */
    it('matches a browser language whose dictionary is not loaded yet', () => {
        vi.stubGlobal('navigator', { language: 'es-ES' });
        expect(getDefaultLocale()).toBe('es');
    });
});

describe('routerLinkI18n', () => {
    beforeEach(() => {
        i18n.global.locale.value = 'en';
    });

    it('prefixes a plain path string', () => {
        expect(routerLinkI18n('/products')).toBe('/en/products');
    });

    it('normalises a relative path', () => {
        expect(routerLinkI18n('products')).toBe('/en/products');
    });

    it('leaves an already-prefixed path alone', () => {
        expect(routerLinkI18n('/it/products')).toBe('/it/products');
    });

    it('prefixes the path of a path-based location object', () => {
        expect(routerLinkI18n({ path: '/products', query: { page: '2' } })).toEqual({
            path: '/en/products',
            query: { page: '2' }
        });
    });

    it('injects the locale into params for a named location', () => {
        expect(routerLinkI18n({ name: 'Products' })).toEqual({
            name: 'Products',
            params: { locale: 'en' }
        });
    });

    it('lets an explicit params.locale win', () => {
        expect(routerLinkI18n({ name: 'Products', params: { locale: 'it' } })).toEqual({
            name: 'Products',
            params: { locale: 'it' }
        });
    });

    /**
     * The documented trap: vue-router IGNORES `params` whenever `path` is present. So a
     * `path`-based location must have the locale put into the path itself — injecting
     * `params.locale` would be silently dropped, and a bare `/products` would then match
     * `/:locale` with `locale = "products"`.
     */
    it('does not try to use params for a path-based location', () => {
        const result = routerLinkI18n({ path: '/products' }) as { path: string; params?: unknown };

        expect(result.path).toBe('/en/products');
        expect(result.params).toBeUndefined();
    });

    it('follows the active locale', () => {
        // Synchronous: nothing here awaited anything, the `async` was vestigial.
        i18n.global.locale.value = 'it';
        expect(routerLinkI18n('/products')).toBe('/it/products');
        expect(getCurrentLocale()).toBe('it');
    });
});

describe('apiText and the reserved api.* namespace', () => {
    let restore: () => void;

    beforeEach(() => {
        restore = withLoadedLanguagesRestored();
        i18n.global.locale.value = 'en';
    });
    afterEach(() => {
        restore();
        // Re-register the bundled dictionary, dropping anything merged under `api.*`.
        // `_updateLocale` clones, so this cannot write back into the imported JSON — which is
        // exactly the property the clone exists for.
        void _updateLocale(i18n, 'en', enMessages as ITranslationDictionaries);
    });

    it('uses this app’s own copy when the API dictionary is absent', () => {
        return _loadLocale(i18n, 'en').then(() => {
            expect(apiText('generic.error-unknown', 'api-errors.unknown')).toBe(
                enMessages['api-errors'].unknown
            );
        });
    });

    it('prefers the API’s own wording once its dictionary is registered', () => {
        return _loadLocale(i18n, 'en').then(() => {
            i18n.global.mergeLocaleMessage('en', {
                [API_NAMESPACE]: { generic: { ['error-unknown']: 'Server says so' } }
            });
            expect(apiText('generic.error-unknown', 'api-errors.unknown')).toBe('Server says so');
        });
    });

    it('never returns a raw key', () => {
        return _loadLocale(i18n, 'en').then(() => {
            expect(apiText('nothing.at.all', 'api-errors.unknown')).toBe(
                enMessages['api-errors'].unknown
            );
        });
    });
});

describe('locale files', () => {
    /**
     * Every leaf key, dot-joined and sorted.
     */
    const flattenKeys = (dictionary: Record<string, unknown>, prefix = ''): string[] =>
        Object.entries(dictionary)
            .flatMap(([key, value]) =>
                value !== null && typeof value === 'object'
                    ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
                    : [`${prefix}${key}`]
            )
            .toSorted();

    it('en.json and it.json declare exactly the same keys', () => {
        expect(flattenKeys(itMessages as Record<string, unknown>)).toEqual(
            flattenKeys(enMessages as Record<string, unknown>)
        );
    });

    it('it.json is actually translated, not a copy of en.json', () => {
        expect(itMessages['users-form']['email-invalid']).not.toBe(
            enMessages['users-form']['email-invalid']
        );
    });

    /**
     * `api` belongs to the backend and arrives at runtime. A hand-authored key under it would be
     * silently overwritten by the fetched dictionary — or worse, silently shadow it.
     */
    it.each([
        ['en', enMessages],
        ['it', itMessages]
    ])('%s.json declares no key under the reserved api namespace', (_locale, messages) => {
        expect(Object.keys(messages)).not.toContain(API_NAMESPACE);
    });
});

/**
 * Module-load-time branches.
 *
 * `supportedLanguages` and the empty-list guard are evaluated once, when the module is first
 * imported, from `import.meta.env`. They cannot be reached by calling anything — only by
 * re-importing the module under different env, which is what `resetModules` + `stubEnv` do here.
 *
 * Worth the machinery because both branches are failure-mode code: one is how the app discovers
 * its locales when no env list is configured, the other is what keeps it from booting with an
 * empty language list. Neither had ever been executed by a test.
 */
describe('module-load configuration', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('derives the locale list from src/locales when no env list is set', () => {
        vi.stubEnv('VITE_APP_SUPPORTED_LOCALES', '');
        return import('@/utils/i18n.ts').then((reloaded) => {
            // The glob sees the real directory: en.json and it.json ship, es.json deliberately does
            // not (it is the API-only locale).
            expect(reloaded.supportedLanguages).toContain('en');
            expect(reloaded.supportedLanguages).toContain('it');
            expect(reloaded.supportedLanguages).not.toContain('es');
        });
    });

    it.each([
        ['an empty value', ''],
        ['only separators', ',,'],
        ['only whitespace', '  ,  ']
    ])('treats %s as "not configured" and discovers from the folder instead', (_l, value) => {
        vi.stubEnv('VITE_APP_SUPPORTED_LOCALES', value);
        return import('@/utils/i18n.ts').then((reloaded) => {
            expect(reloaded.supportedLanguages).toEqual(['en', 'it']);
        });
    });

    /**
     * Both slips are silent, and neither looks like a locale bug when it bites — see the
     * normalisation note on `declaredLocales`. The empty-entry case is the nastier one: `''`
     * matches the empty first segment of `/`, so `routerLinkI18n('/')` would stop prefixing the
     * locale and the root route would quietly lose its language.
     */
    it.each([
        ['spaces after the commas', 'en, it, es'],
        ['a stray comma', 'en,,it,es'],
        ['a trailing comma', 'en,it,es,']
    ])('normalises %s', (_label, value) => {
        vi.stubEnv('VITE_APP_SUPPORTED_LOCALES', value);
        return import('@/utils/i18n.ts').then((reloaded) => {
            expect(reloaded.supportedLanguages).not.toContain('');
            expect(reloaded.supportedLanguages.every((l) => l === l.trim())).toBe(true);
            expect(reloaded.supportedLanguages).toEqual(expect.arrayContaining(['en', 'it', 'es']));
        });
    });

    it('keeps a locale the bundle has no dictionary for, so the API can serve it', () => {
        vi.stubEnv('VITE_APP_SUPPORTED_LOCALES', 'en,it,es');
        return import('@/utils/i18n.ts').then((reloaded) => {
            expect(reloaded.supportedLanguages).toContain('es');
        });
    });
});

/**
 * The one custom message modifier the dictionaries actually use — `it.json`'s
 * `products-list-page.modified-products-list` is `@.customSnakeCase:{'generic.product'}`.
 */
describe('the customSnakeCase modifier', () => {
    it('joins a linked message’s words with underscores', () => {
        return _updateLocale(i18n, 'en', {
            ...(enMessages as ITranslationDictionaries),
            ['modifier-probe']: "@.customSnakeCase:{'modifier-source'}",
            ['modifier-source']: 'two words'
        }).then(() => {
            i18n.global.locale.value = 'en';
            expect(i18n.global.t('modifier-probe')).toBe('two_words');
            return _updateLocale(i18n, 'en', enMessages as ITranslationDictionaries);
        });
    });
});
