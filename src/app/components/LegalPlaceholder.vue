<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'LegalPlaceholder'
};
</script>

<script setup lang="ts">
/**
 * @module
 * What stands on the Terms and Privacy pages until the operator writes the real text: a warning
 * that the text is missing, and a headings-only checklist of what it must cover. It carries no
 * legal wording on purpose — a demo that can become any shop must not ship words a shop could
 * mistake for its own. Admins replace the copy at runtime (locale tier 2).
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { staticPageParagraphs } from '@/app/utils/static-pages.ts';

/**
 * Which page's copy to show.
 */
const props = defineProps<{ page: 'terms' | 'privacy' }>();

/**
 * Translation helpers: `t` for the notice and the checklist title, `tm`/`rt` for the heading list.
 */
// eslint-disable-next-line @typescript-eslint/unbound-method -- vue-i18n's documented destructuring; the composer binds these itself
const { t, tm, rt } = useI18n();

/**
 * The sections the real text must cover, one heading each.
 */
const sections = computed(() =>
    staticPageParagraphs(tm, rt, `static-pages.${props.page}.placeholder.sections`)
);
</script>

<template>
    <div data-test="legal-placeholder">
        <v-alert type="warning" variant="tonal" class="mb-4">
            {{ t(`static-pages.${page}.placeholder.notice`) }}
        </v-alert>

        <p class="mb-2 font-bold">{{ t(`static-pages.${page}.placeholder.checklist-title`) }}</p>
        <ul class="mb-6 list-disc pl-6">
            <li v-for="(section, index) in sections" :key="'s-' + index">{{ section }}</li>
        </ul>
    </div>
</template>
