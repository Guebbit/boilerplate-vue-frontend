<template>
    <article class="theme-card material-graphic-card animate-on-hover">
        <div class="graphic" :class="resolvedVariant">
            <span class="dot dot-lg" />
            <span class="dot dot-sm" />
            <span class="line" />
        </div>
        <div class="content">
            <h3>{{ props.title }}</h3>
            <p>{{ props.description }}</p>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    description: string;
    variant?: 'primary' | 'secondary' | 'tertiary';
}>();

const resolvedVariant = computed(() => props.variant ?? 'primary');
</script>

<style lang="scss">
.material-graphic-card {
    display: grid;
    grid-template-columns: 84px 1fr;
    align-items: center;
    gap: 1rem;
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid rgba(var(--theme-on-surface) / 0.08);
    box-shadow: 0 8px 22px rgba(0 0 0 / 0.06);

    .graphic {
        width: 84px;
        height: 84px;
        border-radius: 1rem;
        position: relative;
        overflow: hidden;
    }

    .dot,
    .line {
        position: absolute;
        display: block;
    }

    .dot {
        border-radius: 50%;
    }

    .dot-lg {
        width: 26px;
        height: 26px;
        top: 14px;
        left: 14px;
        background: rgba(255 255 255 / 0.9);
    }

    .dot-sm {
        width: 12px;
        height: 12px;
        top: 20px;
        right: 18px;
        background: rgba(255 255 255 / 0.75);
    }

    .line {
        left: 14px;
        right: 14px;
        bottom: 18px;
        height: 10px;
        border-radius: 999px;
        background: rgba(255 255 255 / 0.65);
    }

    .graphic.primary {
        background: linear-gradient(150deg, rgb(var(--primary-500)), rgb(var(--primary-700)));
    }

    .graphic.secondary {
        background: linear-gradient(150deg, rgb(var(--secondary-500)), rgb(var(--secondary-700)));
    }

    .graphic.tertiary {
        background: linear-gradient(150deg, rgb(var(--tertiary-500)), rgb(var(--tertiary-700)));
    }

    h3 {
        margin: 0 0 0.35rem;
    }

    p {
        margin: 0;
        opacity: 0.8;
    }
}
</style>
