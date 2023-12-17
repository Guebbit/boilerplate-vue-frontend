<template>
  <select @change="switchLanguage">
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
import { useI18n } from 'vue-i18n';
import { changeLanguage, supportedLanguages } from "@/plugins/i18n";

const { t, locale } = useI18n();

async function switchLanguage(event: Event){
  return changeLanguage((event.target as HTMLSelectElement).value);
}
</script>

<style lang="scss">
// TODO
</style>