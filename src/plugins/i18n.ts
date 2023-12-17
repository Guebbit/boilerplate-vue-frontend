import { nextTick, type WritableComputedRef } from "vue";
import { createI18n, type I18n } from "vue-i18n";
import it from "@/locales/it.json";
import en from "@/locales/en.json";

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
    messages: {
        it,
        en
    },

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
    // Load existing locale
    if (
        // Check if it's the same language
        (i18n.global.locale as WritableComputedRef<string>).value === locale ||
        // or it is already loaded
        loadedLanguages.includes(locale)
    )
        return _changeLanguage(i18n, locale);
    // If not supported, just load default fallback
    // This check happens AFTER because I could load a new unknown language from the server
    if (!supportedLanguages.includes(locale))
        return (i18n.global.fallbackLocale as WritableComputedRef<string>).value;
    // Load from file (if any)
    return import(/* webpackChunkName: "locale-[request]" */ `../locales/${locale}.json`)
        .then(messages => {
            console.log("_loadLocale messages", {...messages})
            _updateLocale(i18n, locale, messages.default);
            loadedLanguages.push(locale)
            return _changeLanguage(i18n, locale);
        })
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
 * @param messages TODO type
 */
export function _updateLocale(i18n: I18n, locale: string, messages: any) {
    loadedLanguages.push(locale);
    i18n.global.setLocaleMessage(locale, messages);
}

/**
 * Same as above, but with default I18n
 *
 * @param locale
 * @param messages TODO type
 */
export function updateLocale(locale: string, messages: any){
    _updateLocale(i18n as I18n, locale, messages);
}

/**
 * Change i18n selected language
 *
 * @param i18n
 * @param locale
 */
export async function _changeLanguage(i18n: I18n, locale: string) {
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


/*

get currentLocale() {
    return i18n.global.locale.value
},

i18nRoute(to) {
    return {
        ...to,
        params: {
            locale: Trans.currentLocale,
            ...to.params
        }
    }
}

TODO https://lokalise.com/blog/vue-i18n/
*/