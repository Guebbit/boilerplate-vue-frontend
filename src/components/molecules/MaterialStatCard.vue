<template>
    <div class="theme-card material-stat-card animate-on-hover" :class="'accent-' + accent">
        <p class="eyebrow">{{ title }}</p>
        <p class="value">{{ value }}</p>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
</template>

<script setup lang="ts">
const {
    title,
    value,
    subtitle,
    accent = 'primary'
} = defineProps<{
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: 'primary' | 'secondary' | 'tertiary';
}>();
</script>

<style lang="scss">
.material-stat-card {
    min-width: 180px;
    padding: 1.25rem;
    border-radius: 1rem;
    border: 1px solid rgba(var(--theme-on-surface) / 0.08);
    box-shadow: 0 10px 28px rgba(0 0 0 / 0.08);

    .eyebrow {
        margin: 0;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.7;
    }

    .value {
        margin: 0.5rem 0 0;
        font-size: 2rem;
        font-weight: 600;
        line-height: 1.1;
    }

    .subtitle {
        margin: 0.5rem 0 0;
        font-size: 0.85rem;
        opacity: 0.8;
    }

    &.accent-primary {
        border-top: 4px solid rgb(var(--primary-500));
    }

    &.accent-secondary {
        border-top: 4px solid rgb(var(--secondary-500));
    }

    &.accent-tertiary {
        border-top: 4px solid rgb(var(--tertiary-500));
    }
}
</style>
