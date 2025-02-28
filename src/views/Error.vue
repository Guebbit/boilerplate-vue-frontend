<script lang="ts">
export default {
    name: 'ErrorPage'
}
</script>

<template>
  <LayoutDefault>
      <template #header>
          <h1 class="theme-page-title"><span>{{ t('users-list-page.page-title') }}</span></h1>
      </template>

      <h1>TODO |{{ status }}|</h1>
      <h3>|{{ message }}|</h3>
  </LayoutDefault>
</template>

<script setup lang="ts">
import LayoutDefault from '@/layouts/LayoutDefault.vue'

const {
    message = ""
} = defineProps<{
  status?: number
  message?: string
}>()
</script>