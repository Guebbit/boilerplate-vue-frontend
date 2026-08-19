<script setup lang="ts" generic="T extends object">
import { computed } from 'vue';
import TableLoadingBar from '@/ui/molecules/TableLoadingBar.vue';

/**
 * Minimal column definition: a visible title and the item key it reads.
 */
// Exported: the props type references it, and an SFC's generated export may not name a private type.
export interface CoreDataTableHeader {
    title: string;
    key: string;
}

const {
    headers,
    items,
    itemValue = 'id',
    loading,
    loadingText = 'Loading...',
    noDataText = 'No data available'
} = defineProps<{
    headers: CoreDataTableHeader[];
    items: T[];
    itemValue?: string;
    loading?: boolean;
    loadingText?: string;
    noDataText?: string;
}>();

const modelValue = defineModel<unknown>();

/**
 * Headers in the shape `v-data-table` expects.
 *
 * Pagination is server-side (stores own `pageSize`/`pageCurrent`), so the table
 * renders whatever it is given: sorting stays enabled, footer is hidden.
 *
 * @returns The column definitions, stripped of any extra property.
 */
const vuetifyHeaders = computed(() =>
    headers.map((header) => ({ title: header.title, key: header.key }))
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
    class: modelValue.value === getValue(item, itemValue) ? 'bg-surface-variant' : undefined,
    'data-test': 'list-row'
});

/**
 * Selects the clicked row through `v-model`.
 *
 * @param _event - Originating DOM event, unused.
 * @param row - Slot argument holding the clicked row under `item`.
 */
const handleRowClick = (_event: Event, { item }: { item: T }) => {
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
