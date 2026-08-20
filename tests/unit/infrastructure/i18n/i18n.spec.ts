import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import type { TranslationDictionaries } from '@/infrastructure/i18n';
import {
    getCurrentLocale,
    getDefaultLocale,
    loadedLanguages,
    _changeLanguage,
    _ensureFallbackLoaded,
    _loadLocale,
    _updateLocale,
    i18n,
    registerLocaleContributors
} from '@/infrastructure/i18n';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import enMessages from '@/locales/en.json';
import itMessages from '@/locales/it.json';

/**
 * The locale machinery itself, against a REAL vue-i18n instance.
 *
 * The other locale spec, `tests/unit/app/guards/locale-choice.spec.ts`, mocks
 * `@/infrastructure/i18n` wholesale: it asserts that `changeLanguage` *was called with* `'it'` and
 * never that anything became Italian. That is the right way to test a router guard, and it leaves
 * everything underneath to this file.
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
    afterEach(() => {
        vi.resetModules();
    });

    /**
     * The folder IS the declaration. There is no env list any more: naming a language in `.env`
     * claimed support without supplying anything able to render it, and `mergeRemoteLocales` is
     * what adds the ones only the API knows about.
     */
    it('is every dictionary in src/locales, and nothing else', () => {
        vi.resetModules();
        return import('@/infrastructure/i18n').then((reloaded) => {
            // The glob sees the real directory: en.json and it.json ship, es.json deliberately
            // does not — it is the language the API supplies at runtime.
            expect(reloaded.supportedLanguages).toEqual(['en', 'it']);
        });
    });

    /**
     * The supported/loaded split, and the reason the list is mutable: a language can be OFFERED
     * before its dictionary is anywhere near the bundle. `mergeRemoteLocales` pushes onto this
     * array at boot, and every module that imported the binding sees the addition.
     */
    it('accepts a locale with no local dictionary being added at runtime', () => {
        vi.resetModules();
        return import('@/infrastructure/i18n').then((reloaded) => {
            reloaded.supportedLanguages.push('es');
            expect(reloaded.supportedLanguages).toContain('es');
        });
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
            expect(instance.global.t('navigation.error-already-logged')).toBe(
                itMessages.navigation['error-already-logged']
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
     * `fallbackLocale` is inert unless the fallback's messages are registered. Without loading
     * it, landing directly on a locale this app has no dictionary for leaves EVERY UI key
     * rendering as its own raw identifier — there is nothing to fall back to.
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
                expect(instance.global.t('navigation.error-already-logged')).toBe(
                    enMessages.navigation['error-already-logged']
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
            expect(instance.global.t('navigation.error-already-logged')).toBe(
                itMessages.navigation['error-already-logged']
            );
        });
    });
});

describe('getDefaultLocale', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.resetModules();
    });

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
        vi.resetModules();
        return import('@/infrastructure/i18n').then((reloaded) => {
            // As `mergeRemoteLocales` would have left it after a boot against a live API.
            reloaded.supportedLanguages.push('es');
            vi.stubGlobal('navigator', { language: 'es-ES' });
            expect(reloaded.getDefaultLocale()).toBe('es');
        });
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
    afterEach(() => {
        vi.resetModules();
    });

    /**
     * The glob is evaluated once, when the module is first imported, and cannot be reached by
     * calling anything — only by re-importing, which is what `resetModules` does here.
     *
     * Worth the machinery because this is the offline floor: it is what the app offers when the
     * API cannot be reached at all, and nothing else in the suite executes the discovery.
     */
    it('discovers the bundled locales from the folder', () => {
        vi.resetModules();
        return import('@/infrastructure/i18n').then((reloaded) => {
            expect(reloaded.supportedLanguages).toContain('en');
            expect(reloaded.supportedLanguages).toContain('it');
            expect(reloaded.supportedLanguages).not.toContain('es');
        });
    });

    /**
     * A fresh copy per import, not the glob's own array. `mergeRemoteLocales` mutates this list,
     * so a shared reference would carry one test's runtime additions into the next.
     */
    it('hands out a list that can be extended without affecting the next import', () => {
        vi.resetModules();
        return import('@/infrastructure/i18n')
            .then((first) => {
                first.supportedLanguages.push('es');
                vi.resetModules();
                return import('@/infrastructure/i18n');
            })
            .then((second) => {
                expect(second.supportedLanguages).not.toContain('es');
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
            ...(enMessages as TranslationDictionaries),
            ['modifier-probe']: "@.customSnakeCase:{'modifier-source'}",
            ['modifier-source']: 'two words'
        }).then(() => {
            i18n.global.locale.value = 'en';
            expect(i18n.global.t('modifier-probe')).toBe('two_words');
            return _updateLocale(i18n, 'en', enMessages);
        });
    });
});

/**
 * Dictionary merging — locales merge at boot, not at build.
 *
 * Each module ships its own `locales/{en,it}.json` and registers a loader for it; `_loadLocale`
 * pulls the shared file plus every registered loader and merges them into one locale. The merge
 * has to be DEEP, because several modules each contribute a slice of the same `navigation`
 * namespace — a shallow merge would leave the last writer's slice and silently drop the rest,
 * which looks exactly like a missing translation and not at all like a bug in the loader.
 *
 * Synthetic contributors rather than the real modules: this is core, and which domains exist is
 * not its business. `cross-cutting/schemas-i18n.spec.ts` is where the real dictionaries are swept.
 */
describe('registerLocaleContributors', () => {
    let restore: () => void;

    beforeEach(() => {
        restore = withLoadedLanguagesRestored();
    });

    afterEach(() => {
        restore();
        // Module state shared with the app-wide singleton — leave it as it was found.
        registerLocaleContributors({});
    });

    it('merges a contributed dictionary on top of the shared one', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        registerLocaleContributors({
            it: [() => Promise.resolve({ madeUpPage: { title: 'Titolo' } })]
        });

        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.t('madeUpPage.title')).toBe('Titolo');
            // and the shared dictionary is still there
            expect(instance.global.t('navigation.error-already-logged')).toBe(
                itMessages.navigation['error-already-logged']
            );
        });
    });

    it('deep-merges two contributors into one shared namespace', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        registerLocaleContributors({
            it: [
                () => Promise.resolve({ navigation: { labelAlpha: 'Alfa' } }),
                () => Promise.resolve({ navigation: { labelBeta: 'Beta' } })
            ]
        });

        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.t('navigation.labelAlpha')).toBe('Alfa');
            expect(instance.global.t('navigation.labelBeta')).toBe('Beta');
            // the shared file's own entries under the same namespace survive both
            expect(instance.global.t('navigation.error-already-logged')).toBe(
                itMessages.navigation['error-already-logged']
            );
        });
    });

    it('ignores contributors registered for a different locale', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        registerLocaleContributors({
            en: [() => Promise.resolve({ madeUpPage: { title: 'Title' } })]
        });

        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.te('madeUpPage.title', 'it')).toBe(false);
        });
    });

    it('replaces the previous registration instead of accumulating', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        registerLocaleContributors({
            it: [() => Promise.resolve({ madeUpPage: { title: 'First' } })]
        });
        registerLocaleContributors({
            it: [() => Promise.resolve({ madeUpPage: { title: 'Second' } })]
        });

        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.t('madeUpPage.title')).toBe('Second');
        });
    });

    /**
     * The regression this whole block exists for.
     *
     * The running app does NOT reach a first locale through `_loadLocale`. `localeChoice`, the
     * router guard, builds the dictionary itself (bundled file + the API's overrides on top) and
     * installs it with `updateLocale`. When the module merge lived in `_loadLocale` only, every
     * unit test passed and the browser rendered `products-list-page.title` as its own key on the
     * very first navigation — 24 e2e failures, all of them module-owned copy.
     *
     * So the merge belongs at the install point. This asserts the guard's path specifically.
     */
    it('merges contributors when a locale is installed via _updateLocale, not just _loadLocale', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        registerLocaleContributors({
            it: [() => Promise.resolve({ madeUpPage: { title: 'Titolo' } })]
        });

        // Exactly what `localeChoice` does: hand over an already-assembled dictionary.
        return _updateLocale(instance, 'it', {
            navigation: { ['error-already-logged']: 'Sei già loggato' },
            api: {}
        }).then(() => {
            instance.global.locale.value = 'it';
            expect(instance.global.t('madeUpPage.title')).toBe('Titolo');
            // and the caller's own dictionary survived the merge
            expect(instance.global.t('navigation.error-already-logged')).toBe('Sei già loggato');
        });
    });

    it('loads the shared dictionary alone when no module contributes', () => {
        const instance = freshInstance();
        loadedLanguages.splice(0);
        registerLocaleContributors({});

        return _loadLocale(instance, 'it').then(() => {
            expect(instance.global.t('navigation.error-already-logged')).toBe(
                itMessages.navigation['error-already-logged']
            );
        });
    });
});
