import { nextTick, type WritableComputedRef } from 'vue';
import { createI18n, type I18n } from 'vue-i18n';
import type { RouteLocationRaw, RouteLocationNamedRaw } from 'vue-router';
// import it from "@/locales/it.json";
// import en from "@/locales/en.json";

export interface ITranslationDictionaries {
    [key: string]: string | ITranslationDictionaries;
}

/**
 * Minimal translate signature compatible with vue-i18n's `t`,
 * for modules (e.g. Zod schema factories) that only need key lookup
 */
export type TranslateFunction = (key: string) => string;

/**
 * [on build]
 * List of supported languages (that we currently don't have loaded but that can be fetched)
 * - From watching the locales folder
 * - From custom ENV variable if present
 *
 * Env variable is necessary in case of dynamic loading of languages from server
 */
export const supportedLanguages = import.meta.env.VITE_APP_SUPPORTED_LOCALES
    ? ((import.meta.env.VITE_APP_SUPPORTED_LOCALES as string | undefined) ?? '').split(',')
    : Object.keys(import.meta.glob('/src/locales/*.json')).map((file) =>
          file.replace('/src/locales/', '').replace('.json', '')
      );

/**
 * [on build]
 * List of loaded languages (already fetched)
 */
export const loadedLanguages: string[] = [];

/**
 * [on build]
 * I18n init
 */
export const i18n = createI18n({
    /**
     * MUST set false to use composition
     */
    legacy: false,

    /**
     * Starting locale.
     * In this case: automatic browser language detection
     * (it's better to use this elsewhere, with routing)
     */
    locale: import.meta.env.VITE_APP_DEFAULT_LOCALE ?? 'en',

    /**
     * Fallback in case requested language doesn't exist
     */
    fallbackLocale: (import.meta.env.VITE_APP_FALLBACK_LOCALE as string | undefined) ?? 'en',

    /**
     * Static import of vocabulary
     * (for large locale files it is better the dynamic one)
     */
    // messages: {
    //     it,
    //     en
    // },

    /**
     * Custom modifiers to transform translations
     */
    modifiers: {
        customSnakeCase: (value) => (typeof value === 'string' ? value.split(' ').join('_') : value)
    }
});

/**
 * [on build]
 * If no language are present, add a fake default one
 */
if (supportedLanguages.length === 0) {
    // eslint-disable-next-line no-console
    console.error('---------- NO LANGUAGES FOUND ----------');
    supportedLanguages.push(
        (i18n.global.fallbackLocale as WritableComputedRef<string | undefined>).value ?? 'no-lang'
    );
    loadedLanguages.push(
        (i18n.global.fallbackLocale as WritableComputedRef<string | undefined>).value ?? 'no-lang'
    );
}

/**
 * Loads a locale's vocabulary (from `src/locales/*.json`) and activates it.
 *
 * Locales already listed in {@link loadedLanguages} skip the import; locales
 * fetched from a server must be registered with {@link updateLocale} before
 * calling this.
 *
 * @param i18n - The vue-i18n instance to load the messages into.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the messages are registered and the active
 *  locale has been switched. Unsupported locales and failed imports fall back
 *  to {@link getDefaultLocale}.
 */
export function _loadLocale(i18n: I18n, locale: string): Promise<unknown> {
    // Load locale
    if (
        // Check if already loaded
        loadedLanguages.includes(locale)
    )
        return _changeLanguage(i18n, locale);
    // If not loaded but supported, load it from a file
    // (load from server must be done elsewhere and then be added to loadadLanguages before calling this function)
    if (supportedLanguages.includes(locale))
        // Load from file (it should be there)
        return (
            import(/* webpackChunkName: "locale-[request]" */ `@/locales/${locale}.json`)
                // file found
                .then((file: { default: ITranslationDictionaries }) =>
                    // translation loaded
                    _updateLocale(i18n, locale, file.default)
                        // then language changed
                        .then(() => _changeLanguage(i18n, locale))
                )
                // this should never happen if in supportedLanguage, but failsafe default language just in case
                .catch(() => _changeLanguage(i18n, getDefaultLocale()))
        );

    // If not supported, change to default language
    return _changeLanguage(i18n, getDefaultLocale());
}

/**
 * {@link _loadLocale} bound to the app-wide {@link i18n} instance.
 *
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is loaded and active.
 */
export function loadLocale(locale: string) {
    return _loadLocale(i18n, locale);
}

/**
 * Registers (or overwrites) the vocabulary of a locale, e.g. after fetching
 * translations from a server.
 *
 * @param i18n - The vue-i18n instance to register the messages on.
 * @param locale - Locale code the messages belong to.
 * @param messages - Nested translation dictionary for that locale.
 * @returns A promise (`nextTick`) resolving once Vue has flushed the update.
 */
export function _updateLocale(i18n: I18n, locale: string, messages: ITranslationDictionaries) {
    // Could be already present and this is just an update
    if (!loadedLanguages.includes(locale)) loadedLanguages.push(locale);
    i18n.global.setLocaleMessage(locale, messages);
    return nextTick();
}

/**
 * {@link _updateLocale} bound to the app-wide {@link i18n} instance.
 *
 * @param locale - Locale code the messages belong to.
 * @param messages - Nested translation dictionary for that locale.
 * @returns A promise resolving once Vue has flushed the update.
 */
export function updateLocale(locale: string, messages: ITranslationDictionaries) {
    return _updateLocale(i18n, locale, messages);
}

/**
 * Switches the active language, loading its vocabulary first when missing, and
 * keeps the `<html lang>` attribute in sync.
 *
 * @param i18n - The vue-i18n instance to switch.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is active and Vue has flushed.
 */
export function _changeLanguage(i18n: I18n, locale: string): Promise<unknown> {
    const setLocale = () => {
        (i18n.global.locale as WritableComputedRef<string>).value = locale;

        /**
         * NOTE:
         * If you need to specify the language setting for headers
         * such as the `fetch` API, set it here (and it's not defined in other ways).
         *
         * The following is an example for axios.
         * axios.defaults.headers.common['Accept-Language'] = locale
         */
        document.querySelector('html')?.setAttribute('lang', locale);
        return nextTick();
    };
    if (!loadedLanguages.includes(locale)) return _loadLocale(i18n, locale).then(() => setLocale());
    return setLocale();
}

/**
 * {@link _changeLanguage} bound to the app-wide {@link i18n} instance.
 *
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is active.
 */
export function changeLanguage(locale: string) {
    return _changeLanguage(i18n, locale);
}

/**
 * Best guess of the locale to use when the route carries none.
 *
 * @returns The browser language when supported, otherwise the configured
 *  fallback locale, `VITE_APP_DEFAULT_LOCALE`, or `'en'` as a last resort.
 */
export function getDefaultLocale() {
    const foundLocale = navigator.language.slice(0, 2);
    // Must check supported (not loaded) languages: on first visit nothing is
    // loaded yet, and browser-language detection would otherwise never match.
    if (supportedLanguages.includes(foundLocale)) return foundLocale;
    return (
        (i18n.global.fallbackLocale as WritableComputedRef<string>).value ||
        (import.meta.env.VITE_APP_DEFAULT_LOCALE as string | undefined) ||
        'en'
    );
}

/**
 * Reads the locale currently active on the app-wide {@link i18n} instance.
 *
 * @returns The active locale code, e.g. `en`.
 */
export const getCurrentLocale = () => i18n.global.locale.value;

/**
 * Prefixes a path with a locale segment, unless it already starts with a
 * supported one.
 *
 * @param path - Absolute or relative path, e.g. `/products` or `products`.
 * @param locale - Locale code to prepend, e.g. `en`.
 * @returns The normalized, locale-prefixed path, e.g. `/en/products`.
 */
function prefixLocalePath(path: string, locale: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const firstSegment = normalized.split('/')[1];
    return supportedLanguages.includes(firstSegment) ? normalized : `/${locale}${normalized}`;
}

/**
 * Rewrites a router location so it carries the current locale.
 *
 * WARNING: vue-router ignores `params` whenever `path` is present, so
 * path-based locations must have the locale prefixed onto the path itself
 * (a bare `/products` would otherwise match `/:locale` with locale="products").
 *
 * @param to - Any router location: a path string, a `path`-based object, or a
 *  named location.
 * @returns The same location with the locale injected — into the path for
 *  string/`path` forms, into `params.locale` for named ones. An explicit
 *  `params.locale` on the input wins.
 */
export function routerLinkI18n(to: RouteLocationRaw): RouteLocationRaw {
    const locale = getCurrentLocale();
    if (typeof to === 'string') return prefixLocalePath(to, locale);
    if ('path' in to && typeof to.path === 'string')
        return {
            ...to,
            path: prefixLocalePath(to.path, locale)
        };
    return {
        ...to,
        params: {
            locale,
            ...(to as RouteLocationNamedRaw).params
        }
    };
}
