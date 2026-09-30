/**
 * @module
 * Where the backend's locale-less `/oauth/callback` redirect lands. `NODE_FRONTEND_URL` names an
 * origin, not a page, so the language the visitor was reading rides back as `?locale=` (saved by
 * the backend at the start of the round trip). It is honoured only when this build speaks it, and
 * removed from the query the callback view receives.
 */
import type { LocationQuery, RouteLocationRaw } from 'vue-router';
import { getDefaultLocale, supportedLanguages } from '@/i18n';

/**
 * The localised `OAuthCallback` location for one incoming redirect.
 *
 * @param query - The redirect's query: `error`, `mfaRequired`, `continue`, and `locale`.
 * @returns The location, in the carried locale when supported and the default otherwise, with
 *  every other query key passed through untouched.
 */
export const oauthCallbackLocation = (query: LocationQuery): RouteLocationRaw => {
    const { locale, ...rest } = query;
    return {
        name: 'OAuthCallback',
        params: {
            locale:
                typeof locale === 'string' && supportedLanguages.includes(locale)
                    ? locale
                    : getDefaultLocale()
        },
        query: rest
    };
};
