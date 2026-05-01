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
                <tr
                    v-for="item in items"
                    v-else
                    :key="`row-${String(item[itemValue])}`"
                    :class="{ active: modelValue === item[itemValue] }"
                    @click="handleRowClick(item)"
                >
                    <td v-for="header in headers" :key="`cell-${String(item[itemValue])}-${header.key}`">
                        <slot
                            :name="`item.${header.key}`"
                            :item="item"
                            :value="item[header.key]"
                            :column="header"
                        >
                            {{ item[header.key] ?? '-' }}
                        </slot>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
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

const emit = defineEmits<{
    rowClick: [item: T];
}>();

const modelValue = defineModel<unknown>();

const handleRowClick = (item: T) => {
    modelValue.value = item[itemValue];
    emit('rowClick', item);
};
</script>
