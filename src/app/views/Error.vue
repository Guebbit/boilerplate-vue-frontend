<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ErrorPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Generic error page: shows the status/message the router redirected with (either an i18n key
 * or router-supplied free text), with a way back Home.
 */
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { SearchX } from 'lucide-vue-next';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * Params supplied by the route: the HTTP-like status shown in the title, and the message —
 * either a raw string from `router.onError`, or an i18n key the template translates.
 */
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
