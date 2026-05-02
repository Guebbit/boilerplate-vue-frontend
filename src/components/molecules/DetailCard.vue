<template>
    <component :is="as" class="theme-card detail-card" v-bind="$attrs">
        <slot />
    </component>
</template>

<script setup lang="ts">
/**
 * Lightweight wrapper around the generic theme card for detail-page surfaces.
 */
const { as = 'article' } = defineProps<{
    as?: 'article' | 'aside' | 'div' | 'section';
}>();
</script>

<style lang="scss">
.detail-card {
    --background: var(--theme-surface);
    --text-color: var(--theme-on-surface);
    --active-background: var(--theme-surface);
    --active-text-color: var(--theme-on-surface);
    border-radius: 1.25rem;
    border: 1px solid rgba(var(--theme-on-surface) / 0.08);
    box-shadow: 0 14px 32px rgba(15 23 42 / 0.08);
    padding: 1.5rem;
    cursor: default;

    &:hover,
    &.active {
        opacity: 1;
    }
}
</style>
