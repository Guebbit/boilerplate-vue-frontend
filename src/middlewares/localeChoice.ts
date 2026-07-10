import {
    getDefaultLocale,
    getCurrentLocale,
    supportedLanguages,
    loadedLanguages,
    updateLocale,
    changeLanguage,
    type ITranslationDictionaries
} from '@/utils/i18n.ts';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

/**
 * Locales already downloaded in a previous session/reload,
 * so the simulated server fetch is only paid once per browser
 */
const DOWNLOADED_LOCALES_KEY = 'downloaded-locales';

const getDownloadedLocales = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(DOWNLOADED_LOCALES_KEY) ?? '[]') as string[];
    } catch {
        return [];
    }
};

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

export const fetchLanguageApi = (locale: string): Promise<[string, ITranslationDictionaries]> =>
    new Promise((resolve) => {
        if (!supportedLanguages.includes(locale)) {
            resolve([locale, {}]);
            return;
        }
        // Simulated server latency, but only the first time a locale is ever
        // downloaded: afterwards it counts as locally cached and loads instantly
        const delayMs = getDownloadedLocales().includes(locale) ? 0 : 1000;
        setTimeout(() => {
            import(`@/locales/${locale}.json`)
                .then((module) => {
                    markLocaleDownloaded(locale);
                    resolve([locale, module.default as ITranslationDictionaries]);
                })
                .catch(() => resolve([locale, {}]));
        }, delayMs);
    });

/**
 * Check that requeste locale is supported and loaded,
 * if not, it will set the custom language based on the user browser
 *
 * @param to
 * @param from
 * @param next
 */
export const localeChoice = (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
) => {
    // Get the locale from the route (if any)
    const locale = to.params.locale as string;

    // If locale is already loaded, just make sure it is the active language
    // (covers back/forward navigation and direct URLs between loaded locales)
    if (loadedLanguages.includes(locale)) {
        if (getCurrentLocale() !== locale)
            return changeLanguage(locale).then(() => {
                next();
            });
        next();
        return;
    }

    // If locale is supported but not loaded, load it then continue
    if (!loadedLanguages.includes(locale) && supportedLanguages.includes(locale))
        return fetchLanguageApi(locale)
            .then(([lang, newLocaleVocabulary]) =>
                // Update the locale and change the language
                updateLocale(lang, newLocaleVocabulary).then(() => changeLanguage(lang))
            )
            .then(() => {
                next();
            });

    //If locale is not present nor supported (or empty), set the default one
    next({
        name: to.name as string,
        params: {
            ...to.params,
            locale: getDefaultLocale()
        },
        query: to.query
    });
};
