import { nextTick, type WritableComputedRef } from "vue";
import { createI18n, type I18n } from "vue-i18n";
// import it from "@/locales/it.json";
// import en from "@/locales/en.json";
import type {
    RouteLocationRaw,
    RouteLocationNamedRaw,
} from "vue-router";

/**
 * List of supported languages
 */
export const supportedLanguages = import.meta.env.VITE_SUPPORTED_LOCALES.split(",");

/**
 * List of loaded languages
 */
export const loadedLanguages :string[] = [];

export const i18n = createI18n({

    /**
     * MUST set false to use composition api
     */
    legacy: false,

    /**
     * Starting locale.
     * In this case: automatic browser language detection
     * (it's better to use this elsewhere, with routing)
     */
    locale: import.meta.env.VITE_DEFAULT_LOCALE || 'en',

    /**
     * Fallback in case requested language doesn't exist
     */
    fallbackLocale: import.meta.env.VITE_FALLBACK_LOCALE || 'en',

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
        customModifier: (str) =>
            typeof str === "string" ? str.split(' ').join('_') : str
    }
});

/**
 * Dynamic import (still from file) of vocabulary
 *
 * @param i18n
 * @param locale
 */
export async function _loadLocale(i18n: I18n, locale: string) {
    // Load locale
    if (
        // Check if it's the same language
        // (i18n.global.locale as WritableComputedRef<string>).value === locale ||
        // or it is already loaded
        loadedLanguages.includes(locale)
    )
        return _changeLanguage(i18n, locale);
    // If not supported, just load default fallback
    // This check happens AFTER because I could load a new unknown language from the server
    if (!supportedLanguages.includes(locale))
        return (i18n.global.fallbackLocale as WritableComputedRef<string>).value;
    // Load from file (it should be there)
    return import(/* webpackChunkName: "locale-[request]" */ `@/locales/${locale}.json`)
        // file found
        .then(file =>
            // translation loaded
            _updateLocale(i18n, locale, file.default)
                // then language changed
                .then(() => _changeLanguage(i18n, locale))
        )
        // this should never happen, but failsafe just in case
        .catch(() => _changeLanguage(i18n, getDefaultLocale()));
}

/**
 * Same as above, but with default I18n
 *
 * @param locale
 */
export async function loadLocale(locale: string) {
    return _loadLocale(i18n as I18n, locale)
}

/**
 * Dynamic import from server of vocabulary
 * (It will overwrite existing locale if already present)
 *
 * @param i18n
 * @param locale
 * @param messages
 */
export async function _updateLocale(i18n: I18n, locale: string, messages: any) {
    // Could be already present and this is just an update
    if(!loadedLanguages.includes(locale))
        loadedLanguages.push(locale);
    i18n.global.setLocaleMessage(locale, messages);
    return nextTick();
}

/**
 * Same as above, but with default I18n
 *
 * @param locale
 * @param messages
 */
export async function updateLocale(locale: string, messages: any){
    return _updateLocale(i18n as I18n, locale, messages);
}

/**
 * Change i18n selected language
 *
 * @param i18n
 * @param locale
 */
export async function _changeLanguage(i18n: I18n, locale: string) {
    if(!loadedLanguages.includes(locale))
        await _loadLocale(i18n, locale);
    (i18n.global.locale as WritableComputedRef<string>).value = locale;

    /**
     * NOTE:
     * If you need to specify the language setting for headers
     * such as the `fetch` API, set it here (and it's not defined in other ways).
     *
     * The following is an example for axios.
     * axios.defaults.headers.common['Accept-Language'] = locale
     */
    document.querySelector('html')?.setAttribute('lang', locale)
    return nextTick();
}

/**
 * Same as above, but with default I18n
 *
 * @param locale
 */
export function changeLanguage(locale: string){
    return _changeLanguage(i18n as I18n, locale);
}

/**
 * Get user locale, fallback if not available
 */
export function getDefaultLocale(){
    const foundLocale = navigator.language.slice(0, 2);
    if(!loadedLanguages.includes(foundLocale))
        return (i18n.global.fallbackLocale as WritableComputedRef<string>).value;
    return foundLocale;
}

/**
 * TODO trovare un metodo alternativo standard
 *
 * Fix Router Links adding our current Locale
 *
 * @param to
 * @constructor
 */
export function RouterLinkI18n(to: RouteLocationRaw) {
    if(typeof to === "string")
        return {
            path: to,
            params: {
                locale: i18n.global.locale.value,
            }
        }
    return {
        ...to,
        params: {
            locale: i18n.global.locale.value,
            ...((to as RouteLocationNamedRaw).params || {})
        }
    }
}