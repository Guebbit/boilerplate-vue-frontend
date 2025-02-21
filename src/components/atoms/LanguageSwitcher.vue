<template>
    <select class="theme-select" @change="switchLanguage">
        <option
            v-for="sLocale in supportedLanguages"
            :key="`locale-${sLocale}`"
            :value="sLocale"
            :selected="locale === sLocale"
        >
            {{ t(`generic.${sLocale}`) }}
        </option>
    </select>
</template>

<script lang="ts" setup>
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { changeLanguage, supportedLanguages } from '@/plugins/i18n'
import { useProfileStore } from '@/stores/profile.ts'
import { storeToRefs } from 'pinia'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

/**
 * Profile logics
 */
const {
    updateProfileLanguage
} = useProfileStore()
const {
    isAuth
} = storeToRefs(useProfileStore())

/**
 * Change locale then load the new route accordingly
 * @param event
 */
async function switchLanguage(event: Event) {
    const newLocale = (event.target as HTMLSelectElement).value
    // if logged in, change user language
    if(isAuth.value)
        await updateProfileLanguage(newLocale)
    // change language
    return changeLanguage(newLocale)
        // then change route, according to new Locale
        .then(() => router.replace({
            params: {
                ...route.params,
                locale: newLocale
            },
            query: route.query
        }))
        // if it fails: go home (with locale recalc)
        .catch(() => router.push('/'))
}
</script>