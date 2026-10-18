/**
 * @module
 * Switching the app's language: the one routing step, and the label of each choice. The language
 * menu in the bar and the language entries in the phone drawer both use it.
 */
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { supportedLanguages } from '@/i18n';
import { languageLabel } from '@/i18n/language-label.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * The choices, the active one, and the action. Call it from `setup`.
 *
 * `switchLanguage` re-enters the current route under the new locale.
 *
 * ROUTING ONLY, and that is the whole point: `localeChoice` loads the dictionary, activates the
 * language and wipes every locale-sensitive module's cache, all off the `:locale` param it is
 * handed. Activating the language HERE first would defeat the last of those — the guard decides
 * whether a switch happened by comparing the param against the locale that is already active, so
 * a caller that switches before navigating makes every switch look like no switch at all, and a
 * product page keeps showing the title it fetched in the language the visitor just left.
 *
 * `persistLocalePreference` is deliberately NOT awaited: the page must be in the new language
 * before the account endpoint has answered, and a failed write must not un-switch it. The session
 * store owns remembering the choice for whoever can have one remembered; this does not know
 * whether anyone is signed in.
 *
 * @returns The language codes, the active one, a choice's label, and the switch.
 */
export const useLanguageSwitch = () => {
    const router = useRouter();
    const route = useRoute();
    // `te` (its "does this key exist" check) is read off the instance directly, so it stays
    // bound to it instead of floating as an unbound method reference.
    const i18n = useI18n();
    const { t, locale } = i18n;

    /**
     * Re-enters the current route under the new locale.
     *
     * @param newLocale - Locale code picked by the user, e.g. `it`.
     * @returns A promise resolving once the router settles: on the same route with the new
     *  locale, or on `/` (locale recalculated) if that navigation fails.
     */
    const switchLanguage = (newLocale: string) => {
        void useSessionStore().persistLocalePreference(newLocale);
        return (
            router
                .replace({
                    params: { ...route.params, locale: newLocale },
                    query: route.query
                })
                // if it fails: go home (with locale recalc)
                .catch(() => router.push('/'))
        );
    };

    /**
     * What a choice is called, in the active language.
     *
     * @param choice - a code from `supportedLanguages`
     */
    const choiceLabel = (choice: string) =>
        languageLabel(choice, locale.value, { t: (key) => t(key), te: (key) => i18n.te(key) });

    return { languages: supportedLanguages, locale, choiceLabel, switchLanguage };
};
