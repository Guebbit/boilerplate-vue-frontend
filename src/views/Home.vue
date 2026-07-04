<template>
    <LayoutDefault id="home-page">
        <template #header>
            <h1 class="text-h3 text-md-h2 font-weight-bold text-center mb-8">
                <span>{{ t('home-page.page-title') }}</span>
            </h1>
        </template>

        <VRow justify="center" class="mb-10">
            <VCol cols="12" lg="9">
                <VCard
                    class="pa-6 pa-md-10 text-center"
                    color="primary"
                    variant="tonal"
                    rounded="xl"
                >
                    <VIcon icon="custom:guebbit" size="56" class="mb-4" />
                    <h2 class="text-h4 text-md-h3 font-weight-bold mb-4">
                        {{ t('home-page.hero-title') }}
                    </h2>
                    <p class="text-body-1 text-md-h6 text-medium-emphasis mb-6">
                        {{ t('home-page.hero-description') }}
                    </p>
                    <VBtn
                        :to="
                            routerLinkI18n({
                                name: 'ProductsList'
                            })
                        "
                        color="primary"
                        size="large"
                        prepend-icon="$cart"
                    >
                        {{ t('home-page.button-browse-products') }}
                    </VBtn>
                </VCard>
            </VCol>
        </VRow>

        <section>
            <h2 class="text-h4 font-weight-bold mb-6">{{ t('home-page.featured-title') }}</h2>
            <VRow>
                <VCol v-for="product in featuredProducts" :key="product.title" cols="12" md="4">
                    <CardInfo
                        class="h-100"
                        :title="product.title"
                        :description="product.description"
                        :variant="product.variant"
                    >
                        <template #icon>
                            <VIcon :icon="product.icon" size="28" />
                        </template>
                    </CardInfo>
                </VCol>
            </VRow>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { VBtn, VCard, VCol, VIcon, VRow } from 'vuetify/components';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';

const { t } = useI18n();

const featuredProducts = computed<
    {
        title: string;
        description: string;
        variant: 'primary' | 'secondary' | 'tertiary';
        icon: string;
    }[]
>(() => [
    {
        title: t('home-page.featured-product-1-title'),
        description: t('home-page.featured-product-1-description'),
        variant: 'primary',
        icon: '$package'
    },
    {
        title: t('home-page.featured-product-2-title'),
        description: t('home-page.featured-product-2-description'),
        variant: 'secondary',
        icon: '$tag'
    },
    {
        title: t('home-page.featured-product-3-title'),
        description: t('home-page.featured-product-3-description'),
        variant: 'tertiary',
        icon: '$star'
    }
]);
</script>
