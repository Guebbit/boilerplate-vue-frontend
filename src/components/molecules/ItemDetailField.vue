<template>
    <article class="item-detail-field" :class="{ 'item-detail-field--full': fullWidth }">
        <div class="item-detail-field__icon" aria-hidden="true">{{ icon }}</div>
        <div class="item-detail-field__content">
            <p class="item-detail-field__label">{{ label }}</p>
            <div class="item-detail-field__value">
                <slot>{{ displayValue }}</slot>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        label: string;
        value?: string | number | null;
        icon?: string;
        fullWidth?: boolean;
    }>(),
    {
        value: undefined,
        icon: '•',
        fullWidth: false
    }
);

const displayValue = computed(() => {
    if (props.value === undefined || props.value === null || props.value === '') return '—';
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

    &--full {
        grid-column: 1 / -1;
    }

    &__icon {
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        display: grid;
        place-items: center;
        font-size: 1.2rem;
        background: linear-gradient(160deg, rgba(var(--detail-accent) / 0.2), rgba(var(--detail-accent) / 0.08));
        color: rgb(var(--detail-accent));
    }

    &__content {
        min-width: 0;
    }

    &__label {
        margin: 0;
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.65;
    }

    &__value {
        margin-top: 0.35rem;
        font-size: 1rem;
        line-height: 1.5;
        overflow-wrap: anywhere;
    }
}
</style>
