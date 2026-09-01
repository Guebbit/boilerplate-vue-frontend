<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'StaticPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One component for the shop's dictionary-driven prose pages (about/FAQ) — see the block below
 * for how it reads `static-pages.<page>` out of the dictionary. `terms` and `privacy` are their
 * own dedicated components (`TermsPage`/`PrivacyPage`): real legal copy needs structure this
 * generic paragraph renderer does not support, but they still cross-link back here.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import {
    STATIC_PAGES,
    staticPageParagraphs,
    staticPageRouteName
} from '@/app/utils/static-pages.ts';

/**
 * One component for the shop's dictionary-driven prose pages — about, FAQ. The copy lives
 * entirely in the locale files under `static-pages.<page>`, so a project built from this
 * boilerplate rewrites dictionaries, not components: `paragraphs` renders as prose, an optional
 * `entries` list renders as question/answer panels (the FAQ), and the pages cross-link so one
 * nav entry (About) is enough to reach all four prose pages.
 */
const { page } = defineProps<{
    /**
     * Which `static-pages.*` dictionary this instance renders.
     */
    page: 'about' | 'faq';
}>();

/**
 * Translation helpers: `t` for plain strings, `tm`/`rt` for the raw paragraph/entry
 * message lists resolved by {@link messageList}.
 */
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

/**
 * The page's prose, one string per paragraph.
 */
const paragraphs = computed(() => staticPageParagraphs(tm, rt, `static-pages.${page}.paragraphs`));

/**
 * The FAQ's question/answer pairs; empty for the prose-only pages.
 */
const entries = computed(() =>
    messageList(`static-pages.${page}.entries`).map((entry) => {
        const { q, a } = entry as { q: string; a: string };
        return { question: rt(q), answer: rt(a) };
    })
);

/**
 * The sibling pages, for the cross-links at the bottom.
 */
const siblings = computed(() => STATIC_PAGES.filter((name) => name !== page));
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
                    :to="routerLinkI18n({ name: staticPageRouteName(name) })"
                >
                    {{ t(`static-pages.${name}.title`) }}
                </RouterLink>
            </nav>
        </v-card>
    </LayoutDefault>
</template>
