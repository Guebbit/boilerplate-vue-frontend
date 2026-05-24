<template>
    <BaseCard class="info-card animate-on-hover">
        <div class="icon-area" :class="resolvedVariant">
            <slot name="icon">
                <Info :size="28" />
            </slot>
        </div>
        <div class="content">
            <h3>{{ title }}</h3>
            <p>{{ description }}</p>
        </div>
    </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import BaseCard from '@/components/atoms/BaseCard.vue';

const props = defineProps<{
    title: string;
    description: string;
    variant?: 'primary' | 'secondary' | 'tertiary';
}>();

const resolvedVariant = computed(() => props.variant ?? 'primary');
</script>

<style lang="scss">
.info-card {
    display: grid;
    grid-template-columns: 84px 1fr;
    align-items: center;
    gap: 1rem;
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid rgba(var(--theme-on-surface) / 0.08);
    box-shadow: 0 8px 22px rgba(0 0 0 / 0.06);

    .icon-area {
        width: 84px;
        height: 84px;
        border-radius: 1rem;
        display: grid;
        place-items: center;
        color: rgba(255 255 255 / 0.95);

        &.primary {
            background: linear-gradient(150deg, rgb(var(--primary-500)), rgb(var(--primary-700)));
        }

        &.secondary {
            background: linear-gradient(
                150deg,
                rgb(var(--secondary-500)),
                rgb(var(--secondary-700))
            );
        }

        &.tertiary {
            background: linear-gradient(150deg, rgb(var(--tertiary-500)), rgb(var(--tertiary-700)));
        }
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
