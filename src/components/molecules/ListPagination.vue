<template>
    <VPagination
        class="list-pagination"
        v-model="modelValue"
        :length="length"
        :total-visible="7"
        density="comfortable"
    />
</template>

<script setup lang="ts">
import { VPagination } from 'vuetify/components';

/*
 * List pagination on top of Vuetify VPagination.
 */
const { length = 0 } = defineProps<{
    /**
     * Total number of pages
     */
    length?: number;
}>();

const modelValue = defineModel<number>();
</script>
