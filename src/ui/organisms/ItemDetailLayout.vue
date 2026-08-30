<script setup lang="ts">
import type { ThemeAccent } from '@/ui/types.ts';
import { useSlots } from 'vue';

/**
 * Shared skeleton for entity detail/edit pages (product, order, user…).
 * Sets --detail-accent so ItemDetailField / ItemDetailHero / chips inside
 * pick up the per-entity accent color automatically.
 *
 * Slots: hero, stats, default (main card), aside, actions.
 */
defineProps<{
    /**
     * Theme accent applied as `--detail-accent`. Defaults to `primary`.
     */
    accent?: ThemeAccent;
}>();

const slots = useSlots();
</script>

<template>
    <section
        class="mx-auto flex w-full max-w-6xl flex-col gap-6"
        :style="{ '--detail-accent': `var(--v-theme-${accent ?? 'primary'})` }"
    >
        <!-- hero + stat cards -->
        <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <slot name="hero" />
            <div
                v-if="slots.stats"
                class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4"
            >
                <slot name="stats" />
            </div>
        </div>

        <!-- main card + optional aside -->
        <div
            class="grid gap-6"
            :class="slots.aside && 'lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]'"
        >
            <div class="min-w-0">
                <slot />
            </div>
            <div v-if="slots.aside" class="flex min-w-0 flex-col gap-4">
                <slot name="aside" />
            </div>
        </div>

        <!-- page-level actions -->
        <div v-if="slots.actions" class="flex flex-wrap items-center gap-3">
            <slot name="actions" />
        </div>
    </section>
</template>
