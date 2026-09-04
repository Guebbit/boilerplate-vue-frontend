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
 * Builds the post-login redirect for the view calling it.
 *
 * @returns `{ redirectAfterLogin }`, a promise-returning action a login step calls once a session
 *  is established.
 */
export const usePostLoginRedirect = () => {
    const router = useRouter();
    const route = useRoute();
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
        const saved = useProfileStore().profile?.locale;
        const applyPreference =
            !route.query.continue &&
            typeof saved === 'string' &&
            saved !== locale.value &&
            supportedLanguages.includes(saved)
                ? changeLanguage(saved)
                : Promise.resolve();

        return applyPreference.then(() =>
            route.query.continue
                ? router.push({ path: route.query.continue as string })
                : router.push(routerLinkI18n({ name: 'Home' }))
        );
    };

    return { redirectAfterLogin };
};
