<script setup lang="ts">
/**
 * @module
 * Wraps Vuetify's `v-pagination`: hides itself entirely for a one-page list, names itself for
 * assistive tech via `ariaLabel`, and moves focus to `<main>` when it unmounts out from under it.
 */
import { ref, watch, nextTick } from 'vue';

/**
 * Component props — see each field's own doc comment below.
 */
const { length = 0, ariaLabel } = defineProps<{
    /**
     * Total number of pages
     */
    length?: number;
    /**
     * What this pager pages, for a page that has more than one of them: "Stock board pages",
     * "Ledger pages". Vuetify names every pager "Pagination Navigation" otherwise, and two
     * landmarks with one name are one landmark to a screen reader.
     */
    ariaLabel?: string;
}>();

/**
 * The current page, one-based.
 */
const modelValue = defineModel<number>({ default: 1 });

/**
 * The pager's root, to know whether focus is inside it when it is about to go.
 */
const root = ref<HTMLElement | undefined>();

/**
 * The pager unmounts the moment a filter narrows the list to one page — which can be the very
 * page the user is on, with focus inside it. Focus lost to `<body>` is a screen reader that goes
 * silent; handed to the main landmark it at least says where it landed.
 */
watch(
    () => length > 1,
    (rendered, wasRendered) => {
        if (rendered || !wasRendered) return;
        if (!root.value?.contains(document.activeElement)) return;
        void nextTick(() =>
            document.querySelector<HTMLElement>('main[data-main-content]')?.focus()
        );
    }
);
</script>

<template>
    <div v-if="length > 1" ref="root" class="contents">
        <v-pagination
            v-model="modelValue"
            :length="length"
            :total-visible="7"
            :aria-label="ariaLabel"
            density="comfortable"
            class="mt-4"
        />
    </div>
</template>
