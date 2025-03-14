import { getDefaultLocale, supportedLanguages, loadedLanguages, updateLocale, changeLanguage } from '@/utils/i18n.ts'
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";
import { fetchLanguageApi } from '@/api'

/**
 * Check that requeste locale is supported and loaded,
 * if not, it will set the custom language based on the user browser
 *
 * @param to
 * @param from
 * @param next
 */
export const localeChoice = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // Get the locale from the route (if any)
    const locale = to.params.locale as string;

    // If locale is already loaded, proceed without problems
    if(loadedLanguages.includes(locale)){
        next();
        return;
    }

    // If locale is supported but not loaded, load it then continue
    if(!loadedLanguages.includes(locale) && supportedLanguages.includes(locale))
        return fetchLanguageApi(locale)
            .then(([lang, newLocaleVocabulary]) =>
                // Update the locale and change the language
                updateLocale(lang, newLocaleVocabulary)
                    .then(() => changeLanguage(lang))
            )
            .then(() => {
                next()
            })

    //If locale is not present nor supported (or empty), set the default one
    next({
        name: to.name as string,
        params: {
            ...to.params,
            locale: getDefaultLocale()
        },
        query: to.query
    })
};