<script setup lang="ts">
import { computed } from 'vue';
import { EMPTY_VALUE } from '@/infrastructure/formatters.ts';

/**
 * Atomic read-only field used by detail pages to render one label/value pair.
 * The icon tile follows the page accent (--detail-accent, set by the view).
 */
const props = defineProps<{
    label: string;
    value?: string | number | null;
    icon?: string;
    fullWidth?: boolean;
}>();

/**
 * Value actually rendered by the field.
 *
 * @returns The stringified prop value, or {@link EMPTY_VALUE} when it is
 *  `undefined`, `null` or an empty string.
 */
const displayValue = computed(() => {
    if (props.value === undefined || props.value === null || props.value === '') return EMPTY_VALUE;
    return String(props.value);
});
</script>

<template>
    <article
        class="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-3.5 rounded-2xl border border-on-surface/10 bg-on-surface/3 p-4"
        :class="props.fullWidth && 'col-span-full'"
    >
        <div
            class="detail-field-icon grid h-12 w-12 place-items-center rounded-2xl text-xl"
            aria-hidden="true"
        >
            {{ props.icon ?? '' }}
        </div>
        <div class="min-w-0">
            <p class="text-xs uppercase tracking-[0.08em] opacity-65">{{ props.label }}</p>
            <div class="mt-1.5 leading-relaxed [overflow-wrap:anywhere]">
                <slot>{{ displayValue }}</slot>
            </div>
        </div>
    </article>
</template>

<style scoped>
.detail-field-icon {
    background: linear-gradient(
        160deg,
        rgb(var(--detail-accent) / 0.2),
        rgb(var(--detail-accent) / 0.08)
    );
    color: rgb(var(--detail-accent));
}
</style>
