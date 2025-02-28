<template>
    <div class="list-pagination">
        <span
            @click="modelValue = 0"
        >
            &laquo;
        </span>
        <span
            v-for="i in length"
            :key="'page-' + i"
            :class="{
                active: modelValue === i
            }"
            @click="modelValue = i"
        >
            {{ i }}
        </span>
        <span
            @click="modelValue = length"
        >
            &raquo;
        </span>
    </div>
</template>

<script setup lang="ts">
const {
    length = 0
} = defineProps<{
    /**
     *
     */
    length?: number
}>()

const modelValue = defineModel<number>()
</script>

<style lang="scss">
.list-pagination {
    & > * {
        padding: 0.5em 1em;
        transition: background-color var(--transitions-time, 0.2s);
        text-decoration: none;
        cursor: pointer;

        &.active {
            background-color: rgba(var(--primary-200) / 0.1);
            color: rgb(var(--on-primary-500));
        }

        &:hover {
            &:not(.active) {
                background-color: var(--button-active-background-color);
                color: var(--button-active-text-color);
            }
        }
    }
}
</style>