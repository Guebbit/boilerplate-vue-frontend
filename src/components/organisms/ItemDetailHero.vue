<template>
    <CardDetail class="item-detail-page-hero animate-on-hover">
        <div class="item-detail-page-hero-icon" aria-hidden="true">
            <slot name="icon" />
        </div>
        <div>
            <p v-if="eyebrow !== undefined && eyebrow !== null" class="item-detail-page-eyebrow">
                {{ eyebrow }}
            </p>
            <h2 class="item-detail-page-hero-title">{{ title }}</h2>
            <p class="item-detail-page-hero-description">{{ description }}</p>
        </div>
    </CardDetail>
</template>

<script setup lang="ts">
import CardDetail from '@/components/organisms/CardDetail.vue';

defineProps<{
    title: string;
    description: string;
    eyebrow?: string | number | null;
}>();
</script>
