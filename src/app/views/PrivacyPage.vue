<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PrivacyPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Dedicated privacy-policy page, its own component rather than a shared paragraph renderer — real policy copy
 * needs its own structure (headings, lists, data-category tables) that the shared paragraph
 * renderer does not support. Opens with a placeholder the operator replaces before going live (this
 * repository ships no legal wording), then the one statement that describes what this app itself
 * does: the analytics tracker and its consent. Then the cookies and storage table, which is real
 * content generated from code (`BrowserStorageTable`), so it stays when the placeholder is
 * replaced. Copy lives under `static-pages.privacy`.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BrowserStorageTable from '@/app/components/BrowserStorageTable.vue';
import LegalPlaceholder from '@/app/components/LegalPlaceholder.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';
import { staticPageParagraphs } from '@/app/utils/static-pages.ts';

/**
 * Translation helpers: `tm`/`rt` for the raw paragraph list resolved by
 * {@link staticPageParagraphs}.
 */
// eslint-disable-next-line @typescript-eslint/unbound-method -- vue-i18n's documented destructuring; the composer binds these itself
const { tm, rt } = useI18n();

/**
 * The page's prose, one string per paragraph.
 */
const paragraphs = computed(() => staticPageParagraphs(tm, rt, 'static-pages.privacy.paragraphs'));
</script>

<template>
    <div id="static-page-privacy">
        <v-card class="mx-auto mt-10 w-full max-w-4xl p-8">
            <LegalPlaceholder page="privacy" />

            <p v-for="(paragraph, index) in paragraphs" :key="'p-' + index" class="mb-4">
                {{ paragraph }}
            </p>

            <BrowserStorageTable />

            <StaticPageLinks current="privacy" />
        </v-card>
    </div>
</template>
