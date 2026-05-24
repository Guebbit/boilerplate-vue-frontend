<template>
    <BaseCard :as="as ?? 'article'" class="detail-card" v-bind="$attrs">
        <slot />
    </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from '@/components/atoms/BaseCard.vue';

defineOptions({ inheritAttrs: false });

defineProps<{
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
