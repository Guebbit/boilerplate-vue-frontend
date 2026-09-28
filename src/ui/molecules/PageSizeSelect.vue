<script setup lang="ts">
/**
 * @module
 * The page-size picker every paginated list repeated verbatim (FA84): a `v-select` over a small
 * set of row counts, bound straight to the toolkit's own `pageSize` ref. Does no i18n of its
 * own — `label` arrives already translated, same as `ListPagination`'s `ariaLabel`.
 */
import { DEFAULT_PAGE_SIZES } from './page-size-options.ts';

const { label, sizes = DEFAULT_PAGE_SIZES } = defineProps<{
    /**
     * Already-translated label for the select.
     */
    label: string;
    /**
     * Row counts offered. Defaults to {@link DEFAULT_PAGE_SIZES}.
     */
    sizes?: number[];
}>();

/**
 * The current page size, bound straight onto a search composable's `pageSize` field — `undefined`
 * where a caller's own filters type makes the field optional, even though every current caller
 * always initialises it.
 */
const modelValue = defineModel<number | undefined>({ required: true });
</script>

<template>
    <v-select
        v-model="modelValue"
        :label="label"
        :items="sizes.map((value) => ({ value, label: String(value) }))"
        item-title="label"
        item-value="value"
        hide-details
    />
</template>
