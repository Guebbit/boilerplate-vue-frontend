<template>
  <LayoutDefault
    centered
  >
      <template #header>
          <h1 class="theme-page-title"><span>{{ t('error-page.page-title') }} {{ status }}</span></h1>
      </template>

      <h3>{{ message }}</h3>
  </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ErrorPage'
}
</script>


<script setup lang="ts">
import LayoutDefault from '@/layouts/LayoutDefault.vue'
import { useI18n } from 'vue-i18n'

const {
    message = ""
} = defineProps<{
  status?: string
  message?: string
}>()

/**
 * Generics
 */
const { t } = useI18n()
</script>