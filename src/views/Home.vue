<template>
    <LayoutDefault id="home-page" :full-width="true">
        <HomeHero @scroll-to="scrollToSection" />

        <!--
            Space voyage: everything after the hero lives on one continuous
            deep-space canvas. Each section is a chapter of the journey.
        -->
        <VThemeProvider theme="dark" with-background class="space-voyage">
            <!-- Atmosphere exit: gradient band easing from hero into deep space -->
            <div class="voyage-atmosphere" aria-hidden="true" />

            <!-- Shared parallax starfield behind all chapters -->
            <SpaceStarfield class="voyage-starfield" />

            <div class="voyage-content">
                <HomeAbout />
                <HomeExpertise />
                <HomeServices @scroll-to="scrollToSection" />
                <HomeContact />

                <!-- Ecommerce section — kept in UX as secondary entry point -->
                <section class="ecommerce-teaser pb-16">
                    <VContainer max-width="1280">
                        <VCard
                            class="cargo-card pa-8 text-center mx-auto"
                            variant="outlined"
                            rounded="xl"
                            max-width="640"
                        >
                            <VIcon icon="$package" size="40" class="mb-4 text-secondary" />
                            <h2 class="text-h5 font-weight-bold mb-3">
                                {{ t('home-page.button-browse-products') }}
                            </h2>
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
            </div>
        </VThemeProvider>
    </LayoutDefault>
</template>

<style scoped>
/* Continuous deep-space canvas — fixed palette independent of active theme */
.space-voyage {
    position: relative;
    overflow: hidden;
    background: linear-gradient(180deg, #0a0e1f 0%, #060a18 18%, #05070f 55%, #03040a 100%);
}

/* Soft band easing from the hero (light) into deep space */
.voyage-atmosphere {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 220px;
    background: linear-gradient(
        180deg,
        rgb(var(--v-theme-primary), 0.14) 0%,
        rgba(10, 14, 31, 0) 100%
    );
    pointer-events: none;
}

.voyage-starfield {
    position: absolute;
    inset: 0;
}

.voyage-content {
    position: relative;
    z-index: 1;
}

/* Cargo bay: outlined Material surface floating on the starfield */
.cargo-card {
    border-color: rgba(187, 134, 252, 0.25);
    background: rgba(14, 18, 38, 0.72);
    backdrop-filter: blur(8px);
    transition:
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.4s ease,
        box-shadow 0.4s ease;
}

.cargo-card:hover {
    transform: translateY(-4px);
    border-color: rgba(187, 134, 252, 0.55);
    box-shadow: 0 16px 48px rgba(187, 134, 252, 0.18);
}

@media (prefers-reduced-motion: reduce) {
    .cargo-card {
        transition: none;
    }
}
</style>

<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { VBtn, VCard, VContainer, VIcon, VThemeProvider } from 'vuetify/components';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import SpaceStarfield from '@/components/atoms/SpaceStarfield.vue';
import HomeHero from '@/components/organisms/HomeHero.vue';
import HomeAbout from '@/components/organisms/HomeAbout.vue';
import HomeExpertise from '@/components/organisms/HomeExpertise.vue';
import HomeServices from '@/components/organisms/HomeServices.vue';
import HomeContact from '@/components/organisms/HomeContact.vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { scrollToSection } from '@/utils/navigation.ts';

const { t } = useI18n();
</script>
