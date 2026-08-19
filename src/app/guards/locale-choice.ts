import {
    getDefaultLocale,
    getCurrentLocale,
    supportedLanguages,
    loadedLanguages,
    updateLocale,
    changeLanguage,
    type TranslationDictionaries
} from '@/infrastructure/i18n';
import { withLocaleOverrides } from '@/infrastructure/i18n/locale-overrides.ts';
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

/**
 * Assembles a locale's dictionary: what this build bundled, with the edited overrides on top.
 *
 * The bundled half is a local import and stays local on purpose — the FILES are the defaults, so
 * a build with no network renders every language it shipped. The override half is a real network
 * fetch (see `@/infrastructure/i18n/locale-overrides.ts`), merged per key, which is what makes a
 * string editable by someone who never opens a code editor and what makes a language this app
 * bundles nothing for work at all: it arrives as overrides alone and falls back per key.
 *
 * **Always resolves, never rejects** — callers have no `.catch`, and a failed dictionary must
 * never strand a navigation. An unsupported locale, a failed import and an unreachable API each
 * degrade to an empty dictionary and fallback copy.
 *
 * @param locale - locale code to load (e.g. `en`, `it`)
 * @returns tuple of `[locale, translationDictionary]`
 */
export const fetchLanguageApi = (locale: string): Promise<[string, TranslationDictionaries]> => {
    // Supported by neither side — `supportedLanguages` already includes anything the API
    // reported at boot. Nothing to import and nothing to fetch, so return before doing either.
    if (!supportedLanguages.includes(locale)) return Promise.resolve([locale, {}]);

    return (
        // Stryker disable next-line StringLiteral: mutating this template to "" leaves an
        // `import("")` that Vite cannot statically analyse, so the whole module fails to
        // transform and every suite errors out instead of one mutant surviving.
        import(`@/locales/${locale}.json`)
            .then((module) => module.default as TranslationDictionaries)
            // A language this build bundles no file for has nothing to import: an empty base is
            // the correct result, not an error. Its overrides become the whole dictionary.
            .catch((): TranslationDictionaries => ({}))
            .then((ownMessages) => withLocaleOverrides(locale, ownMessages))
            .then((messages): [string, TranslationDictionaries] => [locale, messages])
    );
};

/**
 * Router guard (registered on `beforeResolve`) that keeps the active i18n
 * language in sync with the `:locale` route param.
 *
 * Returns a value the router acts on (Vue Router 4 style) instead of calling
 * `next`:
 * - `true`  → allow the navigation to proceed
 * - a route location → redirect (used to inject the default locale)
 *
 * @param to - the target route being navigated to
 * @returns `true` to proceed, or a redirect location to force the default locale
 */
export const localeChoice = (to: RouteLocationNormalized): Promise<true | RouteLocationRaw> => {
    // Locale segment coming from the URL (may be undefined on locale-less routes)
    const locale = to.params.locale as string;

    // Already loaded: just make sure it is the active language and proceed.
    // (covers back/forward navigation and direct URLs between loaded locales)
    if (loadedLanguages.includes(locale))
        return (
            getCurrentLocale() === locale ? Promise.resolve() : changeLanguage(locale)
        ).then<true>(() => true);

    // Supported but not yet loaded: fetch it, register the messages, activate it.
    if (supportedLanguages.includes(locale))
        return fetchLanguageApi(locale)
            .then(([lang, vocabulary]) => updateLocale(lang, vocabulary).then(() => lang))
            .then((lang) => changeLanguage(lang))
            .then<true>(() => true);

    // Missing, unsupported or empty locale: redirect to the same route with the
    // browser/default locale injected into the params.
    //
    // `Promise.resolve` rather than a bare object: the guard is declared to return a promise.
    return Promise.resolve({
        name: to.name as string,
        params: {
            ...to.params,
            locale: getDefaultLocale()
        },
        query: to.query
    });
};
