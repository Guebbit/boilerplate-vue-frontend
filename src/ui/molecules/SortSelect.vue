<script setup lang="ts">
/**
 * @module
 * The "Sort by" picker for a list shown as cards rather than a table: a `v-select` over a small
 * set of server sort tokens (`-price`, `title`), with a leading entry for the default order.
 * Does no i18n of its own — labels arrive translated. A table sorts from its headers instead.
 */
import { computed } from 'vue';

const { label, defaultLabel, options } = defineProps<{
    /**
     * Already-translated label for the select.
     */
    label: string;
    /**
     * Already-translated name of the default order, offered as the first entry.
     */
    defaultLabel: string;
    /**
     * The orders on offer: `value` is the API's sort token (`-price`), `title` its wording.
     */
    options: { value: string; title: string }[];
}>();

/**
 * The chosen token, or `null` for the default order. `null` rather than `undefined` (FA51):
 * Vuetify reads an `undefined` item value as "use the title".
 */
const modelValue = defineModel<string | null>({ default: null });

/**
 * The default entry followed by the caller's options.
 */
const items = computed(() => [{ value: null, title: defaultLabel }, ...options]);
</script>

<template>
    <v-select
        v-model="modelValue"
        :label="label"
        :items="items"
        item-title="title"
        item-value="value"
        data-test="sort-select"
        hide-details
    />
</template>
