<template>
    <article class="item-detail-field" :class="{ 'item-detail-field-full-width': props.fullWidth }">
        <div class="item-detail-field-icon" aria-hidden="true">{{ props.icon ?? '•' }}</div>
        <div class="item-detail-field-content">
            <p class="item-detail-field-label">{{ props.label }}</p>
            <div class="item-detail-field-value">
                <slot>{{ displayValue }}</slot>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { EMPTY_VALUE } from '@/utils/constants.ts';

/**
 * Atomic read-only field used by detail pages to render one label/value pair.
 */
const props = defineProps<{
    label: string;
    value?: string | number | null;
    icon?: string;
    fullWidth?: boolean;
}>();

/**
 * Normalizes empty-like values to a single fallback glyph.
 */
const displayValue = computed(() => {
    if (props.value === undefined || props.value === null || props.value === '') return EMPTY_VALUE;
    return String(props.value);
});
</script>

<style lang="scss">
.item-detail-field {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr);
    gap: 0.9rem;
    align-items: start;
    padding: 1rem;
    border-radius: 1rem;
    background: rgba(var(--theme-on-surface) / 0.03);
    border: 1px solid rgba(var(--theme-on-surface) / 0.08);
}

.item-detail-field-full-width {
    grid-column: 1 / -1;
}

.item-detail-field-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 1rem;
    display: grid;
    place-items: center;
    font-size: 1.2rem;
    background: linear-gradient(160deg, rgba(var(--detail-accent) / 0.2), rgba(var(--detail-accent) / 0.08));
    color: rgb(var(--detail-accent));
}

.item-detail-field-content {
    min-width: 0;
}

.item-detail-field-label {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.65;
}

.item-detail-field-value {
    margin-top: 0.35rem;
    font-size: 1rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
}
</style>
