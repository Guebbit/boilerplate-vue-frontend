<template>
    <LayoutDefault centered>
        <template #header>
            <h1 class="text-h2 font-weight-bold text-center mb-6">
                <span>{{ t('error-page.page-title') }} {{ status }}</span>
            </h1>
        </template>

        <VCard class="pa-6 text-center mx-auto" max-width="560" rounded="xl" variant="tonal">
            <VIcon icon="$alert" size="48" color="warning" class="mb-4" />
            <h3 class="text-h5 font-weight-medium ma-0">{{ normalizedMessage }}</h3>
        </VCard>
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
import { VCard, VIcon } from 'vuetify/components';

const { message = '' } = defineProps<{
    status?: string;
    message?: string;
}>();

/*
 * Generics
 */
const { t } = useI18n();
const normalizedMessage = computed(() =>
    message.startsWith('error-page.') || message.startsWith('navigation.') ? t(message) : message
);
</script>
