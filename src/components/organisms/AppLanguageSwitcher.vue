<template>
    <VSelect
        class="language-switcher"
        :model-value="locale"
        :items="languageItems"
        density="compact"
        variant="solo-filled"
        flat
        hide-details
        prepend-inner-icon="$translate"
        max-width="160"
        @update:model-value="switchLanguage"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { VSelect } from 'vuetify/components';
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

/*
 * VSelect items: locale code + translated label
 */
const languageItems = computed(() =>
    supportedLanguages.map((sLocale) => ({
        value: sLocale,
        title: t(`generic.${sLocale}`)
    }))
);

/**
 * Change locale then load the new route accordingly
 * @param newLocale - selected locale code
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
