/**
 * @module
 * Where a visitor lands once a session exists — extracted so both login steps (the plain form and
 * the 2FA challenge) end the same way rather than each re-deriving it. Chains a locale-preference
 * switch, when one applies, before the actual navigation.
 */
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { changeLanguage, supportedLanguages } from '@/infrastructure/i18n';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * a same-origin, relative path only — the one shape `?continue=` is ever meant to carry.
 *
 * Two failures this guards against: `route.query.continue` is `string[]` when the query string
 * repeats the param (`?continue=a&continue=b`), which an unguarded `as string` cast would hand
 * straight to `router.push` as a malformed location; and `//evil.example` is a
 * protocol-relative URL a browser follows off-site, which is exactly the value an attacker crafts
 * a phishing link's `?continue=` around.
 *
 * @param value - `route.query.continue`, in whichever shape vue-router parsed it as.
 * @returns `true` only for a single string starting with one `/`.
 */
const isSameOriginPath = (value: unknown): value is string =>
    typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');

/**
 * Builds the post-login redirect for the view calling it.
 *
 * @returns `{ redirectAfterLogin }`, a promise-returning action a login step calls once a session
 *  is established.
 */
export const usePostLoginRedirect = () => {
    /**
     * Router instance, for the navigations this file performs.
     */
    const router = useRouter();

    /**
     * Current route, read for its params, query and name.
     */
    const route = useRoute();

    /**
     * The currently active locale code.
     */
    const { locale } = useI18n();

    /**
     * Applies the record's saved language preference, then navigates to the `?continue=` target
     * when present, or `Home` otherwise.
     *
     * The record's language wins over the tab's: the saved preference is what this visitor asked
     * to read, and this is the moment their record joins the session. A `?continue=` deep link
     * keeps its own locale — the page it names wins — and a record with no preference (or one
     * this build does not speak) changes nothing.
     *
     * @returns A promise resolving once navigation settles.
     */
    const redirectAfterLogin = () => {
        const continueTo = isSameOriginPath(route.query.continue)
            ? route.query.continue
            : undefined;
        const saved = useProfileStore().profile?.locale;
        const applyPreference =
            !continueTo &&
            typeof saved === 'string' &&
            saved !== locale.value &&
            supportedLanguages.includes(saved)
                ? changeLanguage(saved)
                : Promise.resolve();

        return applyPreference.then(() =>
            continueTo
                ? router.push({ path: continueTo })
                : router.push(routerLinkI18n({ name: 'Home' }))
        );
    };

    return { redirectAfterLogin };
};
