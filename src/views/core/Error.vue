<template>
    <LayoutDefault centered>
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('error-page.page-title') }} {{ status }}</span>
            </h1>
        </template>

        <h3>{{ normalizedMessage }}</h3>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ErrorPage'
};
</script>

<script setup lang="ts">
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

const { message = '' } = defineProps<{
    status?: string;
    message?: string;
}>();

/**
 * Generics
 */
const { t } = useI18n();
const normalizedMessage = computed(() =>
    message.startsWith('error-page.') || message.startsWith('navigation.') ? t(message) : message
);
</script>
