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
import PageHeader from '@/ui/molecules/PageHeader.vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { SearchX } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { GENERIC_ERROR_KEY, isKnownErrorMessage } from '@/app/utils/error-messages.ts';

/**
 * Params supplied by the route: the HTTP-like status shown in the title, and the message — a
 * known i18n key (`error-page.*` / `navigation.*`) the template translates. `router/index.ts`'s
 * `onError` already folds anything else into {@link GENERIC_ERROR_KEY} before it ever reaches
 * here; the check below is this view's own defence against a hand-typed URL doing the same thing
 * router.onError exists to prevent.
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
 * @returns The translation of `message` when it names a known key, otherwise the generic
 *  "something went wrong" copy — never the raw text a hand-typed URL or an unmapped error might
 *  carry.
 */
const normalizedMessage = computed(() =>
    t(isKnownErrorMessage(message) ? message : GENERIC_ERROR_KEY)
);
</script>

<template>
    <div id="error-page">
        <!-- `meta.customHero` on this route (router/index.ts) tells LayoutDefault to render no
             hero of its own — the status makes this one richer than a plain translated key. -->
        <PageHeader>
            <h1 class="text-3xl font-bold tracking-tight lg:text-4xl">
                {{ t('error-page.page-title') }} {{ status }}
            </h1>
        </PageHeader>

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
    </div>
</template>
