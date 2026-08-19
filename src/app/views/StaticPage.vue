<script lang="ts">
export default {
    name: 'StaticPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';

/**
 * One component for every prose page the shop needs — about, FAQ, terms, privacy. The copy
 * lives entirely in the locale files under `static-pages.<page>`, so a project built from this
 * boilerplate rewrites dictionaries, not components: `paragraphs` renders as prose, an optional
 * `entries` list renders as question/answer panels (the FAQ), and the pages cross-link so one
 * nav entry (About) is enough to reach all four.
 */
const { page } = defineProps<{
    /** Which `static-pages.*` dictionary this instance renders. */
    page: 'about' | 'faq' | 'terms' | 'privacy';
}>();

// eslint-disable-next-line @typescript-eslint/unbound-method -- vue-i18n's documented destructuring; the composer binds these itself
const { t, tm, rt } = useI18n();

/**
 * A `tm()` lookup as a list. `tm` answers `{}` for a path the dictionary does not carry — the
 * prose-only pages have no `entries` — and an empty object taken for an array is a blank page.
 *
 * @param path - The dictionary path.
 * @returns The messages, or nothing.
 */
const messageList = (path: string): unknown[] => {
    const messages = tm(path);
    return Array.isArray(messages) ? messages : [];
};

/** The page's prose, one string per paragraph. */
const paragraphs = computed(() =>
    messageList(`static-pages.${page}.paragraphs`).map((message) => rt(message as string))
);

/** The FAQ's question/answer pairs; empty for the prose-only pages. */
const entries = computed(() =>
    messageList(`static-pages.${page}.entries`).map((entry) => ({
        question: rt((entry as { q: string; a: string }).q),
        answer: rt((entry as { q: string; a: string }).a)
    }))
);

/** The sibling pages, for the cross-links at the bottom. */
const siblings = computed(() =>
    (['about', 'faq', 'terms', 'privacy'] as const).filter((name) => name !== page)
);
</script>

<template>
    <LayoutDefault :id="'static-page-' + page" :title="t(`static-pages.${page}.title`)">
        <v-card class="mx-auto mt-10 w-full max-w-2xl p-8">
            <p v-for="(paragraph, index) in paragraphs" :key="'p-' + index" class="mb-4">
                {{ paragraph }}
            </p>

            <v-expansion-panels v-if="entries.length > 0" class="mt-2" data-test="faq-entries">
                <v-expansion-panel
                    v-for="(entry, index) in entries"
                    :key="'faq-' + index"
                    :title="entry.question"
                    :text="entry.answer"
                />
            </v-expansion-panels>

            <v-divider class="my-6" />
            <nav class="flex flex-wrap gap-4 text-sm" :aria-label="t('static-pages.related')">
                <RouterLink
                    v-for="name in siblings"
                    :key="'link-' + name"
                    class="underline opacity-80"
                    :to="routerLinkI18n({ name: 'Static' + name[0].toUpperCase() + name.slice(1) })"
                >
                    {{ t(`static-pages.${name}.title`) }}
                </RouterLink>
            </nav>
        </v-card>
    </LayoutDefault>
</template>
