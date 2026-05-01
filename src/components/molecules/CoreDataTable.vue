<template>
    <div class="users-table-wrapper">
        <table class="users-table">
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
        </table>
    </div>
</template>

<script setup lang="ts" generic="T extends object">
type CoreDataTableHeader = {
    title: string;
    key: string;
};

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

const getValue = (item: T, key: string): unknown => (item as Record<string, unknown>)[key];

const handleRowClick = (item: T) => {
    modelValue.value = getValue(item, itemValue);
};
</script>
