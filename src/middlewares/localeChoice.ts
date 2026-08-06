import {
    getDefaultLocale,
    getCurrentLocale,
    supportedLanguages,
    loadedLanguages,
    updateLocale,
    changeLanguage,
    type ITranslationDictionaries
} from '@/utils/i18n.ts';
import { withApiDictionary } from '@/utils/localeApi.ts';
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

/**
 * localStorage key holding the list of locales already downloaded in a
 * previous session/reload, so the simulated server fetch is only paid
 * once per browser (not once per navigation).
 */
const DOWNLOADED_LOCALES_KEY = 'downloaded-locales';

/**
 * Reads the set of locales already downloaded on this browser.
 *
 * @returns The stored locale codes, or an empty list when storage is
 *  unavailable or the stored value is corrupted.
 */
const getDownloadedLocales = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(DOWNLOADED_LOCALES_KEY) ?? '[]') as string[];
    } catch {
        return [];
    }
};

/**
 * Persists that a locale has now been downloaded, deduplicating against
 * whatever is already stored.
 *
 * @param locale - Locale code to remember, e.g. `it`.
 * @returns Nothing; storage failures (private mode, quota) are swallowed and
 *  simply re-simulate the latency next time.
 */
const markLocaleDownloaded = (locale: string) => {
    try {
        localStorage.setItem(
            DOWNLOADED_LOCALES_KEY,
            JSON.stringify([...new Set([...getDownloadedLocales(), locale])])
        );
    } catch {
        // Storage unavailable (private mode, quota) — the delay is just re-simulated next time
    }
};

/**
 * Assembles a locale's full dictionary: this app's UI copy plus the API's own copy under the
 * reserved `api.*` namespace.
 *
 * The UI half is a local import. It stays local on purpose — view copy belongs to this
 * repository, and serving it from the API would put it in the API's keyspace (see
 * `@/utils/localeApi.ts`). The artificial latency on a first download exercises the loading UX.
 *
 * The `api.*` half is a real network fetch, and it is why a language the API has and this app
 * does not still works: the UI keys fall back per key to `fallbackLocale` while the API keys are
 * in the requested language.
 *
 * **Always resolves, never rejects** — callers have no `.catch`, and a failed dictionary must
 * never strand a navigation. An unsupported locale, a failed import and an unreachable API each
 * degrade to an empty dictionary and fallback copy.
 *
 * @param locale - locale code to load (e.g. `en`, `it`)
 * @returns tuple of `[locale, translationDictionary]`
 */
export const fetchLanguageApi = (locale: string): Promise<[string, ITranslationDictionaries]> => {
    // Supported by neither side — `supportedLanguages` already includes anything the API
    // reported at boot. Nothing to import and nothing to fetch, so return before doing either.
    if (!supportedLanguages.includes(locale)) return Promise.resolve([locale, {}]);

    return new Promise<ITranslationDictionaries>((resolve) => {
        // Simulated server latency, but only the first time a locale is ever
        // downloaded: afterwards it counts as locally cached and loads instantly
        const delayMs = getDownloadedLocales().includes(locale) ? 0 : 1000;
        setTimeout(() => {
            // Stryker disable next-line StringLiteral: mutating this template to "" leaves an
            // `import("")` that Vite cannot statically analyse, so the whole module fails to
            // transform and every suite errors out instead of one mutant surviving.
            import(`@/locales/${locale}.json`)
                .then((module) => {
                    markLocaleDownloaded(locale);
                    resolve(module.default as ITranslationDictionaries);
                })
                // A locale the API has and this app does not has no file to import: an empty UI
                // dictionary is the correct result, not an error.
                .catch(() => resolve({}));
        }, delayMs);
    })
        .then((ownMessages) => withApiDictionary(locale, ownMessages))
        .then((messages): [string, ITranslationDictionaries] => [locale, messages]);
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
export const localeChoice = async (
    to: RouteLocationNormalized
): Promise<true | RouteLocationRaw> => {
    // Locale segment coming from the URL (may be undefined on locale-less routes)
    const locale = to.params.locale as string;

    // Already loaded: just make sure it is the active language and proceed.
    // (covers back/forward navigation and direct URLs between loaded locales)
    if (loadedLanguages.includes(locale)) {
        if (getCurrentLocale() !== locale) await changeLanguage(locale);
        return true;
    }

    // Supported but not yet loaded: fetch it, register the messages, activate it.
    if (supportedLanguages.includes(locale)) {
        const [lang, vocabulary] = await fetchLanguageApi(locale);
        await updateLocale(lang, vocabulary);
        await changeLanguage(lang);
        return true;
    }

    // Missing, unsupported or empty locale: redirect to the same route with the
    // browser/default locale injected into the params.
    return {
        name: to.name as string,
        params: {
            ...to.params,
            locale: getDefaultLocale()
        },
        query: to.query
    };
};
