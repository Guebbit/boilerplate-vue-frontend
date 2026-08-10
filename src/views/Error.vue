<template>
    <LayoutDefault id="error-page" centered>
        <template #header>
            <h1 class="text-3xl font-bold tracking-tight lg:text-4xl">
                {{ t('error-page.page-title') }} {{ status }}
            </h1>
        </template>

        <v-empty-state :title="status" :text="normalizedMessage">
            <template #media>
                <SearchX :size="72" class="text-primary" aria-hidden="true" />
            </template>
            <template #actions>
                <v-btn color="primary" :to="routerLinkI18n({ name: 'Home' })">
                    {{ t('navigation.label-home') }}
                </v-btn>
            </template>
        </v-empty-state>
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
import { SearchX } from 'lucide-vue-next';
import { routerLinkI18n } from '@/utils/i18n.ts';

const { message = '' } = defineProps<{
    status?: string;
    message?: string;
}>();

/**
 * Generics
 */
const { t } = useI18n();
/**
 * Message actually displayed.
 *
 * @returns The translation of the message when it is a known i18n key
 *  (`error-page.*` / `navigation.*`), otherwise the raw text, since router
 *  errors carry free-form messages.
 */
const normalizedMessage = computed(() =>
    message.startsWith('error-page.') || message.startsWith('navigation.') ? t(message) : message
);
</script>
