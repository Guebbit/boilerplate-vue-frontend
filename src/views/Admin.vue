<script lang="ts">
export default {
    name: 'AdminPage'
}
</script>


<script setup lang="ts">
import LayoutDefault from '@/layouts/LayoutDefault.vue'
import { useI18n } from 'vue-i18n'

/**
 * Generics
 */
const { t } = useI18n()
</script>

<template>
    <LayoutDefault>
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('admin-page.page-title') }}</span></h1>
        </template>
    </LayoutDefault>
</template>