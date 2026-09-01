<script lang="ts">
export default {
    name: 'TermsPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Dedicated terms-of-service page, its own component rather than a shared paragraph renderer — real legal copy
 * needs its own structure (headings, lists, numbered clauses) that the shared paragraph
 * renderer does not support. Copy lives under `static-pages.terms.paragraphs`, currently
 * placeholder Lorem Ipsum, replaced before launch.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';
import { staticPageParagraphs } from '@/app/utils/static-pages.ts';

/**
 * Translation helpers: `t` for plain strings, `tm`/`rt` for the raw paragraph list resolved by
 * {@link staticPageParagraphs}.
 */
// eslint-disable-next-line @typescript-eslint/unbound-method -- vue-i18n's documented destructuring; the composer binds these itself
const { t, tm, rt } = useI18n();

/**
 * The page's prose, one string per paragraph.
 */
const paragraphs = computed(() => staticPageParagraphs(tm, rt, 'static-pages.terms.paragraphs'));
</script>

<template>
    <LayoutDefault id="static-page-terms" :title="t('static-pages.terms.title')">
        <v-card class="mx-auto mt-10 w-full max-w-2xl p-8">
            <p v-for="(paragraph, index) in paragraphs" :key="'p-' + index" class="mb-4">
                {{ paragraph }}
            </p>

            <StaticPageLinks current="terms" />
        </v-card>
    </LayoutDefault>
</template>
