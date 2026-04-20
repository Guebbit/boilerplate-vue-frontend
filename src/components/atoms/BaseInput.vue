<template>
    <div class="base-input">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <input
            :id="uuid"
            v-model="model"
            :type="type"
            :placeholder="placeholder"
            :disabled="disabled"
        />
    </div>
</template>

<script setup lang="ts">
import { getUuid } from '@guebbit/js-toolkit';

defineProps<{
    label?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
}>();

const uuid = getUuid();
const model = defineModel<string | number | undefined>();
</script>

<style lang="scss">
.base-input {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
        font-size: 0.85em;
        font-weight: 500;
    }

    input {
        padding: 0.5em 0.75em;
        border: 1px solid rgba(128, 128, 128, 0.4);
        border-radius: 0.2em;
        background: rgba(var(--secondary-200) / 0.2);
        outline: none;
        font-size: 0.95em;

        &:focus {
            border-color: rgb(var(--primary-500));
        }
    }
}
</style>
