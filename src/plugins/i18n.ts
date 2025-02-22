import { nextTick, type WritableComputedRef } from 'vue'
import { createI18n, type I18n } from 'vue-i18n'
import type { RouteLocationRaw, RouteLocationNamedRaw } from 'vue-router'
// import it from "@/locales/it.json";
// import en from "@/locales/en.json";

export interface ITranslationDictionaries {
    [key: string]: string | ITranslationDictionaries
}

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
      )

/**
 * [on build]
 * List of loaded languages (already fetched)
 */
export const loadedLanguages: string[] = []


/**
 * [on build]
 * I18n init
 */
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
    locale: (import.meta.env.VITE_APP_DEFAULT_LOCALE as string | undefined) ?? 'en',

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
        customModifier: (string_) =>
            typeof string_ === 'string' ? [...string_].join('.').toUpperCase() : string_
    }
})

/**
 * [on build]
 * If no language are present, add a fake default one
 */
if(supportedLanguages.length === 0){
    console.error("---------- NO LANGUAGES FOUND ----------")
    supportedLanguages.push(
        (i18n.global.fallbackLocale as WritableComputedRef<string>).value ?? "no-lang"
    )
    loadedLanguages.push(
        (i18n.global.fallbackLocale as WritableComputedRef<string>).value ?? "no-lang"
    )
}

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
        return _changeLanguage(i18n, locale)
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
        )

    // If not supported, change to default language
    return _changeLanguage(i18n, getDefaultLocale())
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
export async function _updateLocale(
    i18n: I18n,
    locale: string,
    messages: ITranslationDictionaries
) {
    // Could be already present and this is just an update
    if (!loadedLanguages.includes(locale)) loadedLanguages.push(locale)
    i18n.global.setLocaleMessage(locale, messages)
    return nextTick()
}

/**
 * Same as above, but with default I18n
 *
 * @param locale
 * @param messages
 */
export async function updateLocale(locale: string, messages: ITranslationDictionaries) {
    return _updateLocale(i18n as I18n, locale, messages)
}

/**
 * Change i18n selected language
 *
 * @param i18n
 * @param locale
 */
export async function _changeLanguage(i18n: I18n, locale: string) {
    if (!loadedLanguages.includes(locale)) await _loadLocale(i18n, locale)
    ;(i18n.global.locale as WritableComputedRef<string>).value = locale

    /**
     * NOTE:
     * If you need to specify the language setting for headers
     * such as the `fetch` API, set it here (and it's not defined in other ways).
     *
     * The following is an example for axios.
     * axios.defaults.headers.common['Accept-Language'] = locale
     */
    document.querySelector('html')?.setAttribute('lang', locale)
    return nextTick()
}

/**
 * Same as above, but with default I18n
 *
 * @param locale
 */
export function changeLanguage(locale: string) {
    return _changeLanguage(i18n as I18n, locale)
}

/**
 * Get user locale, fallback if not available
 */
export function getDefaultLocale() {
    const foundLocale = navigator.language.slice(0, 2)
    if (!loadedLanguages.includes(foundLocale))
        return (i18n.global.fallbackLocale as WritableComputedRef<string>).value
    return foundLocale
}

/**
 * Fix Router Links adding our current Locale
 *
 * @param to
 * @constructor
 */
export function routerLinkI18n(to: RouteLocationRaw) {
    if (typeof to === 'string')
        return {
            path: to,
            params: {
                locale: i18n.global.locale.value
            }
        }
    return {
        ...to,
        params: {
            locale: i18n.global.locale.value,
            ...(to as RouteLocationNamedRaw).params
        }
    }
}
