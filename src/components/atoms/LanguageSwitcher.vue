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
import { useRouter } from "vue-router";
import { useI18n } from 'vue-i18n';
import { changeLanguage, supportedLanguages } from "@/plugins/i18n";

const router = useRouter();
const { t, locale } = useI18n();

/**
 * Change locale then load the new route accordingly
 * @param event
 */
async function switchLanguage(event: Event){
  const newLocale = (event.target as HTMLSelectElement).value;
  // change language
  return changeLanguage(newLocale)
      // then change route, according to new Locale
      .then(() => router.replace({ params: { locale: newLocale } }))
      // if it fails: go home (with locale recalc)
      .catch(() => router.push("/"));
}
</script>