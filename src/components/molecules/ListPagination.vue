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
defineProps({
    /**
     *
     */
    length: {
        type: Number,
        default: () => 0
    }
})

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
            background-color: var(--button-background-color);
            color: var(--button-text-color);
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