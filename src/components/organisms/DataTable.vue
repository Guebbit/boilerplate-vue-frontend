<template>
    <VTable class="list-table" hover>
        <thead>
            <tr>
                <th v-for="header in headers" :key="'header-' + header.key">
                    {{ header.title }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-if="loading">
                <td :colspan="headers.length">{{ loadingText }}</td>
            </tr>
            <tr v-else-if="items.length === 0">
                <td :colspan="headers.length">{{ noDataText }}</td>
            </tr>
            <template v-else>
                <tr
                    v-for="(item, rowIndex) in items"
                    :key="`row-${String(getValue(item, itemValue) ?? rowIndex)}`"
                    :class="{ active: modelValue === getValue(item, itemValue) }"
                    @click="handleRowClick(item)"
                >
                    <td
                        v-for="header in headers"
                        :key="`cell-${String(getValue(item, itemValue) ?? rowIndex)}-${header.key}`"
                    >
                        <slot
                            :name="`item.${header.key}`"
                            :item="item"
                            :value="getValue(item, header.key)"
                            :column="header"
                        >
                            {{ getValue(item, header.key) ?? '-' }}
                        </slot>
                    </td>
                </tr>
            </template>
        </tbody>
    </VTable>
</template>

<script setup lang="ts" generic="T extends object">
import { VTable } from 'vuetify/components';

type CoreDataTableHeader = {
    title: string;
    key: string;
};

/*
 * Generic data table on top of Vuetify VTable.
 * Keeps full control of headers/rows and per-cell slots (item.<key>).
 */
const {
    headers,
    items,
    itemValue = 'id',
    loading = false,
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

/*
 * Reads a property from a row item.
 * @param item - row item
 * @param key - property name
 * @returns property value
 */
const getValue = (item: T, key: string): unknown => (item as Record<string, unknown>)[key];

/*
 * Selects the clicked row (sets the model to its itemValue).
 * @param item - clicked row item
 */
const handleRowClick = (item: T) => {
    modelValue.value = getValue(item, itemValue);
};
</script>
