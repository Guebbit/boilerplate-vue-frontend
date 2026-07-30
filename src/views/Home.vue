<template>
    <LayoutDefault id="home-page" :title="t('home-page.page-title')">
        <section class="mb-8 flex justify-center">
            <v-card class="hero-card w-full max-w-3xl p-8 text-center sm:text-left">
                <h2 class="text-2xl font-bold sm:text-3xl">{{ t('home-page.hero-title') }}</h2>
                <p class="mt-3 leading-relaxed opacity-80">
                    {{ t('home-page.hero-description') }}
                </p>
                <v-btn
                    color="primary"
                    size="large"
                    class="mt-6"
                    :to="routerLinkI18n({ name: 'ProductsList' })"
                >
                    {{ t('home-page.button-browse-products') }}
                    <ArrowRight :size="18" class="ml-2" aria-hidden="true" />
                </v-btn>
            </v-card>
        </section>

        <section class="grid gap-4">
            <h2 class="m-0 text-xl font-semibold">{{ t('home-page.featured-title') }}</h2>
            <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <CardInfo
                    v-for="product in featuredProducts"
                    :key="product.title"
                    :title="product.title"
                    :description="product.description"
                    :variant="product.variant"
                >
                    <template #icon>
                        <component :is="product.icon" :size="28" />
                    </template>
                </CardInfo>
            </div>
        </section>
    </LayoutDefault>
</template>

<style scoped>
/* soft brand-colored glow, driven by the active theme */
.hero-card {
    background:
        radial-gradient(circle at top right, rgb(var(--v-theme-primary) / 0.14), transparent 45%),
        radial-gradient(
            circle at bottom left,
            rgb(var(--v-theme-secondary) / 0.1),
            transparent 45%
        ),
        rgb(var(--v-theme-surface));
}
</style>

<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ArrowRight, Package, Tag, Star } from 'lucide-vue-next';
import type { Component } from 'vue';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';

const { t } = useI18n();

/**
 * Showcase entries of the landing page.
 *
 * @returns The three featured cards, re-translated whenever the locale changes.
 */
const featuredProducts = computed<
    {
        title: string;
        description: string;
        variant: 'primary' | 'secondary' | 'tertiary';
        icon: Component;
    }[]
>(() => [
    {
        title: t('home-page.featured-product-1-title'),
        description: t('home-page.featured-product-1-description'),
        variant: 'primary',
        icon: Package
    },
    {
        title: t('home-page.featured-product-2-title'),
        description: t('home-page.featured-product-2-description'),
        variant: 'secondary',
        icon: Tag
    },
    {
        title: t('home-page.featured-product-3-title'),
        description: t('home-page.featured-product-3-description'),
        variant: 'tertiary',
        icon: Star
    }
]);
</script>
