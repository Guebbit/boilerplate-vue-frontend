<script setup lang="ts">
/**
 * @module
 * Language-switcher menu. Delegates dictionary loading to the i18n runtime and locale
 * persistence to the session store; this file only decides the routing side of a switch.
 */
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Check, Languages } from 'lucide-vue-next';
import { supportedLanguages } from '@/infrastructure/i18n';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Router instance used to re-enter the current route under the new locale.
 */
const router = useRouter();

/**
 * Current route, whose params/query are preserved across a language switch.
 */
const route = useRoute();

/**
 * Translation function and the currently active locale code.
 */
const { t, locale } = useI18n();

/**
 * Re-enters the current route under the new locale.
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
 * store owns remembering the choice for whoever can have one remembered; this component does not
 * know whether anyone is signed in.
 *
 * @param newLocale - Locale code picked by the user, e.g. `it`.
 * @returns A promise resolving once the router settles: on the same route with
 *  the new locale, or on `/` (locale recalculated) if that navigation fails.
 */
function switchLanguage(newLocale: string) {
    void useSessionStore().persistLocalePreference(newLocale);
    return (
        router
            .replace({
                params: {
                    ...route.params,
                    locale: newLocale
                },
                query: route.query
            })
            // if it fails: go home (with locale recalc)
            .catch(() => router.push('/'))
    );
}
</script>

<template>
    <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
            <!--
                The accessible name contains the visible text (WCAG 2.5.3): a voice-control user
                says what they see, and "Language" alone would not match a button reading "EN".
            -->
            <v-btn
                v-bind="menuProps"
                variant="text"
                class="px-2"
                data-test="language-switcher"
                :aria-label="`${t('navigation.label-language')}: ${locale.toUpperCase()}`"
            >
                <Languages :size="18" class="mr-1" aria-hidden="true" />
                {{ locale.toUpperCase() }}
            </v-btn>
        </template>

        <!-- A menu of actions, not a listbox: picking one switches the language and closes it. -->
        <v-list density="compact" role="menu" :aria-label="t('navigation.label-language')">
            <v-list-item
                v-for="sLocale in supportedLanguages"
                :key="`locale-${sLocale}`"
                role="menuitem"
                :active="locale === sLocale"
                :aria-current="locale === sLocale ? 'true' : undefined"
                color="primary"
                :data-test="`language-option-${sLocale}`"
                @click="switchLanguage(sLocale)"
            >
                <v-list-item-title>{{ t(`generic.${sLocale}`) }}</v-list-item-title>
                <template #append>
                    <Check v-if="locale === sLocale" :size="16" aria-hidden="true" />
                </template>
            </v-list-item>
        </v-list>
    </v-menu>
</template>
