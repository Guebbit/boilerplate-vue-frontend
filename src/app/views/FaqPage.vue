<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'FaqPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The shop's FAQ. Questions are grouped in topics, each topic a heading over an expansion-panel
 * list; every question, answer and topic title comes from `static-pages.faq.topics.<topic>`. The
 * topic KEYS and their order are declared here, the copy is not. Closes with a contact CTA that
 * renders only when the feedback module is in the build.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MessageSquare } from 'lucide-vue-next';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import StaticPageLinks from '@/app/components/StaticPageLinks.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * Translation helpers: `t` for plain strings, `tm`/`rt` for the raw entry lists.
 */
// eslint-disable-next-line @typescript-eslint/unbound-method -- vue-i18n's documented destructuring; the composer binds these itself
const { t, tm, rt } = useI18n();

/**
 * Router instance, asked whether the contact page exists in this build.
 */
const router = useRouter();

/**
 * The topics, in reading order — each a dictionary key under `static-pages.faq.topics.*`.
 */
const TOPICS: readonly string[] = ['shopping', 'orders', 'account', 'demo'];

/**
 * One question with its answer, rendered.
 */
interface FaqEntry {
    question: string;
    answer: string;
}

/**
 * A `tm()` lookup as a list of question/answer pairs. `tm` answers `{}` for a path the
 * dictionary does not carry, and an empty object taken for an array is a blank topic.
 *
 * @param topic - The topic key.
 * @returns The topic's entries, rendered; empty when the dictionary has none.
 */
const entriesOf = (topic: string): FaqEntry[] => {
    const messages = tm(`static-pages.faq.topics.${topic}.entries`);
    if (!Array.isArray(messages)) return [];
    return messages.map((entry) => {
        const { q, a } = entry as { q: string; a: string };
        return { question: rt(q), answer: rt(a) };
    });
};

/**
 * Every topic with its title and entries, re-resolved on locale change; a topic the dictionary
 * left empty is dropped rather than rendered as a heading over nothing.
 */
const topics = computed(() =>
    TOPICS.map((key) => ({
        key,
        title: t(`static-pages.faq.topics.${key}.title`),
        entries: entriesOf(key)
    })).filter((topic) => topic.entries.length > 0)
);

/**
 * Whether the contact form is part of this build — the closing CTA points at it.
 */
const hasContact = computed(() => router.hasRoute('Contact'));
</script>

<template>
    <LayoutDefault id="static-page-faq" :title="t('static-pages.faq.title')">
        <div class="mx-auto mt-10 grid w-full max-w-3xl gap-8">
            <p class="m-0 text-lg opacity-80">{{ t('static-pages.faq.intro') }}</p>

            <section
                v-for="topic in topics"
                :key="'topic-' + topic.key"
                class="grid gap-3"
                :data-test="'faq-topic-' + topic.key"
            >
                <h2 class="m-0 text-xl font-semibold">{{ topic.title }}</h2>
                <v-expansion-panels variant="accordion" data-test="faq-entries">
                    <v-expansion-panel
                        v-for="(entry, index) in topic.entries"
                        :key="'faq-' + topic.key + '-' + index"
                        :title="entry.question"
                        :text="entry.answer"
                    />
                </v-expansion-panels>
            </section>

            <!-- Still stuck: the contact form, when this build ships one. -->
            <v-card v-if="hasContact" variant="tonal" class="p-6" data-test="faq-contact">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <MessageSquare :size="24" class="text-primary" aria-hidden="true" />
                        <div>
                            <h2 class="m-0 text-base font-semibold">
                                {{ t('static-pages.faq.contact.title') }}
                            </h2>
                            <p class="m-0 text-sm opacity-80">
                                {{ t('static-pages.faq.contact.text') }}
                            </p>
                        </div>
                    </div>
                    <v-btn color="primary" :to="routerLinkI18n({ name: 'Contact' })">
                        {{ t('static-pages.faq.contact.button') }}
                    </v-btn>
                </div>
            </v-card>

            <v-card class="px-8 pb-8 pt-2">
                <StaticPageLinks current="faq" />
            </v-card>
        </div>
    </LayoutDefault>
</template>
