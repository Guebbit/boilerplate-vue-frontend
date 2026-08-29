<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import type { ThemeAccent } from '@/ui/types.ts';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ArrowRight, Package, Tag, Star } from 'lucide-vue-next';
import type { Component } from 'vue';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

const { t } = useI18n();
const router = useRouter();

/**
 * Whether the products domain is in this build.
 *
 * The hero call-to-action points at a route this module does not own, which is the one place the
 * app shell still reaches into a domain. `hasRoute` is checked rather than assumed because the
 * route name is a *string*: with `products` deleted from `src/modules.ts` the link resolves to
 * nothing, and neither the compiler nor the type-checker can see it — the page just renders a
 * button that navigates nowhere.
 *
 * A landing page is allowed to be about this particular app; it is not allowed to break when a
 * domain is removed.
 */
const hasProductsList = computed(() => router.hasRoute('ProductsList'));

/**
 * Showcase entries of the landing page.
 *
 * @returns The three featured cards, re-translated whenever the locale changes.
 */
const featuredProducts = computed<
    {
        title: string;
        description: string;
        variant: ThemeAccent;
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

<template>
    <LayoutDefault id="home-page" :title="t('home-page.page-title')">
        <section class="mb-8 flex justify-center">
            <v-card class="hero-card w-full max-w-3xl p-8 text-center sm:text-left">
                <h2 class="text-2xl font-bold sm:text-3xl">{{ t('home-page.hero-title') }}</h2>
                <p class="mt-3 leading-relaxed opacity-80">
                    {{ t('home-page.hero-description') }}
                </p>
                <v-btn
                    v-if="hasProductsList"
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
