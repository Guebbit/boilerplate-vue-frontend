<script setup lang="ts">
import CardDetail from '@/ui/organisms/CardDetail.vue';

defineProps<{
    title: string;
    description: string;
    eyebrow?: string | number | null;
}>();
</script>

<template>
    <CardDetail class="detail-hero grid items-center gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div
            class="grid h-18 w-18 place-items-center rounded-3xl text-3xl shadow-lg bg-gradient-to-br from-[rgb(var(--detail-accent))] to-[rgb(var(--detail-accent))]/65 text-surface"
            aria-hidden="true"
        >
            <slot name="icon" />
        </div>
        <div>
            <p
                v-if="eyebrow !== undefined && eyebrow !== null"
                class="mb-1 text-xs uppercase tracking-[0.12em] opacity-60"
            >
                {{ eyebrow }}
            </p>
            <h2 class="text-2xl font-bold leading-tight">{{ title }}</h2>
            <p class="mt-2 leading-relaxed opacity-75">{{ description }}</p>
        </div>
    </CardDetail>
</template>

<style scoped>
/* soft accent glow in the hero corner, driven by the page accent */
.detail-hero {
    background:
        radial-gradient(circle at top right, rgb(var(--detail-accent) / 0.16), transparent 38%),
        rgb(var(--v-theme-surface));
}
</style>
