<script setup lang="ts">
/**
 * @module
 * Language-switcher menu. Delegates dictionary loading to the i18n runtime and locale
 * persistence to the session store; this file only decides the routing side of a switch.
 */
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Check, Languages } from 'lucide-vue-next';
import { changeLanguage, supportedLanguages } from '@/infrastructure/i18n';
import { useSessionStore } from '@/infrastructure/stores/session.ts';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();

/**
 * Switches the app language and re-enters the current route under the new locale.
 *
 * Everything here is routing, which is the only part of a language switch that belongs to the app
 * shell. The i18n runtime owns loading the dictionary (`changeLanguage`) and the session store
 * owns remembering the choice for whoever can have one remembered — this component decides
 * neither, and does not know whether anyone is signed in.
 *
 * `persistLocalePreference` is deliberately NOT awaited: the page must be in the new language
 * before the account endpoint has answered, and a failed write must not un-switch it.
 *
 * @param newLocale - Locale code picked by the user, e.g. `it`.
 * @returns A promise resolving once the router settles: on the same route with
 *  the new locale, or on `/` (locale recalculated) if that navigation fails.
 */
function switchLanguage(newLocale: string) {
    void useSessionStore().persistLocalePreference(newLocale);
    return Promise.resolve(
        // change language
        changeLanguage(newLocale)
            // then change route, according to new Locale
            .then(() =>
                router.replace({
                    params: {
                        ...route.params,
                        locale: newLocale
                    },
                    query: route.query
                })
            )
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
