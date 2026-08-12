<script setup lang="ts">
const { length = 0 } = defineProps<{
    /**
     * Total number of pages
     */
    length?: number;
}>();

const modelValue = defineModel<number>({ default: 1 });
</script>

<template>
    <v-pagination
        v-if="length > 1"
        v-model="modelValue"
        :length="length"
        :total-visible="7"
        density="comfortable"
        class="mt-4"
    />
</template>
