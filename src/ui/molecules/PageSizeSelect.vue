<script setup lang="ts">
/**
 * @module
 * The page-size picker every paginated list repeated verbatim: a `v-select` over a small
 * set of row counts, bound straight to the toolkit's own `pageSize` ref. The label defaults to
 * the shared "Page size" string; a caller passes its own only to say something else.
 */
import { useI18n } from 'vue-i18n';
import { DEFAULT_PAGE_SIZES } from './page-size-options.ts';

/**
 * Props of the picker: an optional label and the offered row counts.
 */
const { label, sizes = DEFAULT_PAGE_SIZES } = defineProps<{
    /**
     * Already-translated label for the select. Defaults to `generic.page-size`.
     */
    label?: string;
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

/**
 * Translation function, for the default label.
 */
const { t } = useI18n();
</script>

<template>
    <v-select
        v-model="modelValue"
        :label="label ?? t('generic.page-size')"
        :items="sizes.map((value) => ({ value, label: String(value) }))"
        item-title="label"
        item-value="value"
        data-test="page-size"
        hide-details
    />
</template>
