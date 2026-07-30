<template>
    <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
            <v-btn
                v-bind="menuProps"
                variant="text"
                class="px-2"
                :aria-label="t('navigation.label-language')"
            >
                <Languages :size="18" class="mr-1" aria-hidden="true" />
                {{ locale.toUpperCase() }}
            </v-btn>
        </template>

        <v-list density="compact" :aria-label="t('navigation.label-language')">
            <v-list-item
                v-for="sLocale in supportedLanguages"
                :key="`locale-${sLocale}`"
                :active="locale === sLocale"
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

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Check, Languages } from 'lucide-vue-next';
import { changeLanguage, supportedLanguages } from '@/utils/i18n.ts';
import { useProfileStore } from '@/stores/profile.ts';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();

/**
 * Profile logics
 */
const { updateProfileLanguage } = useProfileStore();
const { isAuth } = storeToRefs(useProfileStore());

/**
 * Switches the app language and re-enters the current route under the new
 * locale, persisting the choice on the profile when logged in.
 *
 * @param newLocale - Locale code picked by the user, e.g. `it`.
 * @returns A promise resolving once the router settles: on the same route with
 *  the new locale, or on `/` (locale recalculated) if that navigation fails.
 */
async function switchLanguage(newLocale: string) {
    // if logged in, change user language
    if (isAuth.value) await updateProfileLanguage(newLocale);
    // change language
    return (
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
