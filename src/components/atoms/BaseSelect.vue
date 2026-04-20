<template>
    <div class="base-select">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <select :id="uuid" v-model="model" :disabled="disabled">
            <option v-if="placeholder !== undefined" value="">{{ placeholder }}</option>
            <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>
    </div>
</template>

<script setup lang="ts">
import { getUuid } from '@guebbit/js-toolkit';

defineProps<{
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    options: { value: string | number | boolean | undefined; label: string }[];
}>();

const uuid = getUuid();
const model = defineModel<string | number | boolean | undefined>();
</script>

<style lang="scss">
.base-select {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
        font-size: 0.85em;
        font-weight: 500;
    }

    select {
        padding: 0.5em 0.75em;
        border: 1px solid rgba(128, 128, 128, 0.4);
        border-radius: 0.2em;
        background: rgba(var(--secondary-200) / 0.2);
        outline: none;
        font-size: 0.95em;
        cursor: pointer;

        &:focus {
            border-color: rgb(var(--primary-500));
        }
    }
}
</style>
