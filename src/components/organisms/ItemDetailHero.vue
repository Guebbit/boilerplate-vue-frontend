<template>
    <CardDetail class="item-detail-page-hero d-flex align-center ga-6">
        <VAvatar color="primary" size="72" rounded="lg" aria-hidden="true">
            <slot name="icon" />
        </VAvatar>
        <div>
            <p
                v-if="eyebrow !== undefined && eyebrow !== null"
                class="item-detail-page-eyebrow text-overline ma-0"
            >
                {{ eyebrow }}
            </p>
            <h2 class="item-detail-page-hero-title text-h5 ma-0">{{ title }}</h2>
            <p class="item-detail-page-hero-description text-body-2 text-medium-emphasis ma-0 mt-1">
                {{ description }}
            </p>
        </div>
    </CardDetail>
</template>

<script setup lang="ts">
import { VAvatar } from 'vuetify/components';
import CardDetail from '@/components/organisms/CardDetail.vue';

/*
 * Hero header for detail pages: icon avatar + eyebrow + title + description.
 */
defineProps<{
    title: string;
    description: string;
    eyebrow?: string | number | null;
}>();
</script>
