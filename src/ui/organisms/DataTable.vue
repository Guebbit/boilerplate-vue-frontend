<script setup lang="ts" generic="T extends object">
import { computed, useAttrs, useSlots } from 'vue';
import TableLoadingBar from '@/ui/molecules/TableLoadingBar.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';

const {
    headers,
    items,
    itemValue = 'id',
    loading,
    loadingText = 'Loading...',
    noDataText = 'No data available',
    rowTest = 'list-row'
} = defineProps<{
    headers: CoreDataTableHeader<T>[];
    items: T[];
    itemValue?: string;
    loading?: boolean;
    loadingText?: string;
    noDataText?: string;
    /**
     * `data-test` put on every row. Defaults to `list-row`, which is what a page with one table
     * should keep — the specs read it the same way everywhere.
     *
     * It exists for the page that shows TWO tables at once: `inventory` puts a stock board above
     * its movement ledger, and a spec asserting on rows has to be able to say which table it
     * means.
     */
    rowTest?: string;
}>();

const modelValue = defineModel<unknown>();

/**
 * Whether the caller wants row selection at all.
 *
 * A table without a `v-model` is a table nobody asked to select from — an audit log, a read-only
 * ledger — and it should not highlight a row or swallow a click. `defineModel` alone cannot tell
 * a bound model from an unbound local ref, so the listener the parent passes is the evidence.
 */
const attributes = useAttrs();
const slots = useSlots();

/** The columns whose head the view renders itself. */
const customHeaders = computed(() => headers.filter((header) => `header.${header.key}` in slots));
const isSelectable = computed(() => 'onUpdate:modelValue' in attributes);

/**
 * Headers in the shape `v-data-table` expects.
 *
 * Pagination is server-side (stores own `pageSize`/`pageCurrent`), so the table
 * renders whatever it is given: sorting stays enabled, footer is hidden.
 *
 * @returns The column definitions, stripped of any extra property.
 */
const vuetifyHeaders = computed(() =>
    headers.map((header) => ({ title: header.title, key: header.key, width: header.width }))
);

/**
 * Reads an arbitrary key off a row, since `T` is only known to be an object.
 *
 * @param item - Row to read from.
 * @param key - Property name to read.
 * @returns The raw property value, or `undefined` when absent.
 */
const getValue = (item: T, key: string): unknown => (item as Record<string, unknown>)[key];

/**
 * Per-row attributes, marking the selected row for styling and tests.
 *
 * @param row - Slot argument holding the row under `item`.
 * @returns The attributes to spread on the `<tr>`: a highlight class when the
 *  row matches the model value, plus a `data-test` hook.
 */
const rowProps = ({ item }: { item: T }) => ({
    class:
        isSelectable.value && modelValue.value === getValue(item, itemValue)
            ? 'bg-surface-variant'
            : undefined,
    'data-test': rowTest
});

/**
 * Selects the clicked row through `v-model`.
 *
 * @param _event - Originating DOM event, unused.
 * @param row - Slot argument holding the clicked row under `item`.
 */
const handleRowClick = (_event: Event, { item }: { item: T }) => {
    if (!isSelectable.value) return;
    modelValue.value = getValue(item, itemValue);
};
</script>

<template>
    <v-data-table
        :headers="vuetifyHeaders"
        :items="items"
        :item-value="itemValue"
        :loading="loading"
        :loading-text="loadingText"
        :no-data-text="noDataText"
        items-per-page="-1"
        hide-default-footer
        class="rounded-xl border"
        :row-props="rowProps"
        @click:row="handleRowClick"
    >
        <!-- Replaces Vuetify's unnamed internal bar — see `TableLoadingBar` for why. -->
        <template #loader>
            <TableLoadingBar />
        </template>

        <!--
            Forward a `header.*` slot ONLY when the view provides one, so a view can put more than
            a title in a column head (a per-column count, a hint). Forwarding all of them would
            replace Vuetify's default header — sort icon included — on every table in the app.
        -->
        <template
            v-for="header in customHeaders"
            #[`header.${header.key}`]
            :key="'header-' + header.key"
        >
            <slot :name="`header.${header.key}`" :column="header" />
        </template>

        <!-- forward every `item.*` slot to keep the existing view API -->
        <template
            v-for="header in headers"
            #[`item.${header.key}`]="slotProps"
            :key="'slot-' + header.key"
        >
            <slot
                :name="`item.${header.key}`"
                :item="slotProps.item"
                :value="getValue(slotProps.item, header.key)"
                :column="header"
            >
                {{ getValue(slotProps.item, header.key) ?? '-' }}
            </slot>
        </template>
    </v-data-table>
</template>
