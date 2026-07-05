<template>
    <LayoutDefault id="home-page" :full-width="true">
        <HomeHero @scroll-to="scrollToSection" />
        <HomeAbout />
        <HomeExpertise />
        <HomeServices @scroll-to="scrollToSection" />
        <HomeContact />

        <!-- Ecommerce section — kept in UX as secondary entry point -->
        <section class="ecommerce-teaser py-12">
            <VContainer max-width="1280">
                <VCard class="pa-8 text-center" variant="tonal" color="secondary" rounded="xl">
                    <VIcon icon="$package" size="40" class="mb-4" />
                    <h2 class="text-h5 font-weight-bold mb-3">{{ t('home-page.button-browse-products') }}</h2>
                    <VBtn
                        :to="routerLinkI18n({ name: 'ProductsList' })"
                        color="secondary"
                        size="large"
                        rounded="xl"
                        prepend-icon="$cart"
                        class="mt-2"
                    >
                        {{ t('home-page.button-browse-products') }}
                    </VBtn>
                </VCard>
            </VContainer>
        </section>
    </LayoutDefault>
</template>

<style lang="scss">
#home-page {
    /* Remove default page-content padding so hero can be full-width */
    .page-content {
        padding-top: 0 !important;
    }

    /* Smooth section scroll */
    scroll-behavior: smooth;
}
</style>

<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { VBtn, VCard, VContainer, VIcon } from 'vuetify/components';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import HomeHero from '@/components/organisms/HomeHero.vue';
import HomeAbout from '@/components/organisms/HomeAbout.vue';
import HomeExpertise from '@/components/organisms/HomeExpertise.vue';
import HomeServices from '@/components/organisms/HomeServices.vue';
import HomeContact from '@/components/organisms/HomeContact.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';

const { t } = useI18n();

/*
 * Smooth-scroll to a section by element id.
 * @param id - target element id string
 */
function scrollToSection(id: string) {
    document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>
