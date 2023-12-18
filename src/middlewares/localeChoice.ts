import { getDefaultLocale, supportedLanguages, loadedLanguages, loadLocale } from "@/plugins/i18n";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";

/**
 *
 * @param to
 * @param from
 * @param next
 */
export default async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const paramLocale = to.params.locale as string;
    // loadedLanguages can be downloaded from the server,
    // so it can have unexpected languages that supportedLanguages doesn't know
    if(!loadedLanguages.includes(paramLocale) && !supportedLanguages.includes(paramLocale))
        // locale not loaded and not supported, try again with the default (will pass)
        return next(getDefaultLocale());
    // load new locale
    return loadLocale(paramLocale)
        .then(() => next());
}