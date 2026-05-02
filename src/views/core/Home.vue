<template>
    <LayoutDefault id="home-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('home-page.page-title') }}</span>
            </h1>
        </template>

        <section class="home-intro-wrapper">
            <div class="theme-card animate-on-hover card-outlined home-intro-card">
                <h2>{{ t('home-page.hero-title') }}</h2>
                <p>{{ t('home-page.hero-description') }}</p>
                <RouterLink
                    :to="
                        routerLinkI18n({
                            name: 'ProductsList'
                        })
                    "
                    class="theme-button"
                >
                    {{ t('home-page.button-browse-products') }}
                </RouterLink>
            </div>
        </section>

        <section class="home-featured-wrapper">
            <h2 class="home-featured-title">{{ t('home-page.featured-title') }}</h2>
            <div class="home-featured-grid">
                <MaterialGraphicCard
                    v-for="product in featuredProducts"
                    :key="product.title"
                    :title="product.title"
                    :description="product.description"
                    :variant="product.variant"
                />
            </div>
        </section>
    </LayoutDefault>
</template>

<style lang="scss">
#home-page {
    .home-intro-wrapper {
        display: flex;
        justify-content: center;
        margin-bottom: 2rem;
    }

    .home-intro-card {
        width: min(760px, 100%);
        display: grid;
        gap: 0.9rem;
    }

    .home-featured-wrapper {
        display: grid;
        gap: 1rem;
    }

    .home-featured-title {
        margin: 0;
    }

    .home-featured-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
    }
}
</style>

<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';

const { t } = useI18n();

const featuredProducts = computed<
    {
        title: string;
        description: string;
        variant: 'primary' | 'secondary' | 'tertiary';
    }[]
>(() => [
    {
        title: t('home-page.featured-product-1-title'),
        description: t('home-page.featured-product-1-description'),
        variant: 'primary'
    },
    {
        title: t('home-page.featured-product-2-title'),
        description: t('home-page.featured-product-2-description'),
        variant: 'secondary'
    },
    {
        title: t('home-page.featured-product-3-title'),
        description: t('home-page.featured-product-3-description'),
        variant: 'tertiary'
    }
]);
</script>
