/**
 * @module
 * Router guard that keeps the active i18n locale in sync with the `:locale` route param —
 * loading the bundled dictionary plus any remote overrides on first use of a locale, and
 * redirecting when the param is missing, unsupported, or a supported tag in another casing (the
 * canonical spelling is the one URL: `/pt-br/` goes to `/pt-BR/`). A cache that holds
 * server text is keyed on the active locale (`dependsOn` in the store), so a switch here needs no
 * cleanup step of its own.
 */
import {
    getDefaultLocale,
    getCurrentLocale,
    supportedLanguages,
    loadedLanguages,
    updateLocale,
    changeLanguage,
    type TranslationDictionaries
} from '@/i18n';
import { withLocaleOverrides } from '@/infrastructure/locale-overrides.ts';
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

/**
 * Assembles a locale's dictionary: what this build bundled, with the edited overrides on top.
 *
 * The bundled half is a local import and stays local on purpose — the FILES are the defaults, so
 * a build with no network renders every language it shipped. The override half is a real network
 * fetch (see `@/infrastructure/locale-overrides.ts`), merged per key, which is what makes a
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
    /**
     * Supported by neither side — `supportedLanguages` already includes anything the API
     * reported at boot. Nothing to import and nothing to fetch, so return before doing either.
     */
    if (!supportedLanguages.includes(locale)) return Promise.resolve([locale, {}]);

    return (
        // Stryker disable next-line StringLiteral: mutating this template to "" leaves an
        // `import("")` that Vite cannot statically analyse, so the whole module fails to
        // transform and every suite errors out instead of one mutant surviving.
        import(`@/locales/${locale}.json`)
            /**
             * A dynamic import with a template-string specifier resolves to `any` — TypeScript
             * cannot statically know which module it names — so the callback's own parameter is
             * typed honestly instead of accessing `.default` on that `any`.
             */
            .then((module: { default: unknown }) => module.default as TranslationDictionaries)
            /**
             * A language this build bundles no file for has nothing to import: an empty base is
             * the correct result, not an error. Its overrides become the whole dictionary.
             */
            .catch((): TranslationDictionaries => ({}))
            .then((ownMessages) => withLocaleOverrides(locale, ownMessages))
            .then((messages): [string, TranslationDictionaries] => [locale, messages])
    );
};

/**
 * The canonical BCP 47 spelling of a tag (`pt-br` -> `pt-BR`), or the tag as written when it is
 * malformed. The backend canonicalises with the same `Intl` call, so both sides agree on the one
 * spelling a language has.
 *
 * @param tag - a tag in any casing
 */
const canonicalTag = (tag: string): string => {
    // Intl.getCanonicalLocales throws a RangeError on a malformed tag and has no non-throwing
    // form; the tag as written is exactly as good as a pre-check would have produced.
    // https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/getCanonicalLocales
    // eslint-disable-next-line no-restricted-syntax -- see above, no non-throwing check exists
    try {
        return Intl.getCanonicalLocales(tag).at(0) ?? tag;
    } catch {
        return tag;
    }
};

/**
 * The supported language a URL segment names, in the spelling the list holds it in. Case-blind:
 * BCP 47 tags compare that way, and only the canonical spelling is the address.
 *
 * @param tag - the `:locale` segment as the visitor typed it
 * @returns the supported spelling, or `undefined` when no supported language matches
 */
const supportedSpellingOf = (tag: string): string | undefined => {
    const wanted = canonicalTag(tag);
    return supportedLanguages.find((candidate) => canonicalTag(candidate) === wanted);
};

/**
 * The most recently REQUESTED locale, across every call to this guard.
 *
 * Two navigations close together (e.g. a user double-clicking two language options) each start
 * their own async chain, and the two can settle in EITHER order. Without this, whichever chain's
 * network round-trip happens to finish last wins — activating a language the visitor already
 * navigated away from. {@link activateIfLatest} is the guard: a chain only activates its locale
 * when it is still the last one requested by the time it gets there.
 */
let latestRequestedLocale: string | undefined;

/**
 * Activates a locale, unless a NEWER navigation has requested a different one since this chain
 * started — see {@link latestRequestedLocale}.
 *
 * @param locale - Locale this chain was loading/activating.
 * @returns A promise resolving once the locale is active, or immediately if superseded.
 */
const activateIfLatest = (locale: string): Promise<unknown> =>
    latestRequestedLocale === locale ? changeLanguage(locale) : Promise.resolve();

/**
 * The same route and query under another locale.
 *
 * @param to - the route being navigated to
 * @param locale - the locale the address should carry
 */
const redirectTo = (to: RouteLocationNormalized, locale: string): RouteLocationRaw => ({
    name: to.name as string,
    params: { ...to.params, locale },
    query: to.query
});

/**
 * Router guard (registered on `beforeResolve`) that keeps the active i18n
 * language in sync with the `:locale` route param.
 *
 * Returns a value the router acts on (Vue Router 4 style) instead of calling
 * `next`:
 * - `true`  → allow the navigation to proceed
 * - a route location → redirect (used to inject the default locale, or the canonical casing)
 *
 * @param to - the target route being navigated to
 * @returns `true` to proceed, or a redirect location to the default or the canonical locale
 */
export const localeChoice = (to: RouteLocationNormalized): Promise<true | RouteLocationRaw> => {
    // Locale segment coming from the URL (may be undefined on locale-less routes)
    const requested = to.params.locale as string;

    /**
     * A supported tag in another casing (`/pt-br/`) is the same language at the wrong address:
     * send it to the canonical one rather than to the default language.
     */
    const locale = supportedSpellingOf(requested) ?? requested;
    if (locale !== requested) return Promise.resolve(redirectTo(to, locale));

    /**
     * Recorded before any async work starts, so a slower CONCURRENT chain for an earlier
     * navigation can tell it has been superseded — see `activateIfLatest`.
     */
    latestRequestedLocale = locale;

    /**
     * Already loaded: just make sure it is the active language and proceed.
     * (covers back/forward navigation and direct URLs between loaded locales)
     */
    if (loadedLanguages.includes(locale))
        return (getCurrentLocale() === locale ? Promise.resolve() : activateIfLatest(locale)).then(
            () => true as const
        );

    /**
     * Supported but not yet loaded: fetch it, register the messages, activate it — every
     * activation funnels through here, whether the navigation came from a language switcher, a
     * saved profile preference or a locale-less deep link, so an edited translation shows
     * regardless of how this locale first got loaded.
     */
    if (supportedLanguages.includes(locale))
        return fetchLanguageApi(locale)
            .then(([lang, vocabulary]) => updateLocale(lang, vocabulary).then(() => lang))
            .then((lang) => activateIfLatest(lang))
            .then(() => true as const);

    /**
     * Missing, unsupported or empty locale: redirect to the same route with the
     * browser/default locale injected into the params.
     *
     * `Promise.resolve` rather than a bare object: the guard is declared to return a promise.
     */
    return Promise.resolve(redirectTo(to, getDefaultLocale()));
};
