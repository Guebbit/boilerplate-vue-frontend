<template>
    <section id="home-hero" class="hero-section">
        <!-- Gradient backdrop -->
        <div class="hero-bg" aria-hidden="true" />

        <VContainer max-width="1280" class="hero-container">
            <VRow align="center" justify="space-between" class="py-8 py-md-16">
                <!-- Text column -->
                <VCol cols="12" md="7" lg="6" class="hero-text-col">
                    <div class="hero-eyebrow mb-3">
                        <VChip
                            color="primary"
                            variant="tonal"
                            size="small"
                            class="font-weight-bold text-uppercase"
                        >
                            {{ t('home-page.hero-eyebrow') }}
                        </VChip>
                    </div>

                    <h1 class="hero-title text-h3 text-md-h2 font-weight-black mb-5">
                        {{ t('home-page.hero-title') }}
                    </h1>

                    <p
                        class="hero-description text-body-1 text-md-h6 font-weight-regular mb-8"
                        style="line-height: 1.7"
                    >
                        {{ t('home-page.hero-description') }}
                    </p>

                    <div class="hero-ctas d-flex flex-wrap ga-4">
                        <VBtn
                            color="primary"
                            size="large"
                            rounded="xl"
                            elevation="4"
                            append-icon="$arrowRight"
                            @click="$emit('scrollTo', 'home-contact')"
                        >
                            {{ t('home-page.hero-cta-primary') }}
                        </VBtn>
                        <VBtn
                            variant="outlined"
                            color="primary"
                            size="large"
                            rounded="xl"
                            append-icon="$chevronDown"
                            @click="$emit('scrollTo', 'home-services')"
                        >
                            {{ t('home-page.hero-cta-secondary') }}
                        </VBtn>
                    </div>
                </VCol>

                <!-- Profile image column -->
                <VCol
                    cols="12"
                    md="5"
                    lg="5"
                    class="d-flex justify-center justify-md-end mt-10 mt-md-0"
                >
                    <div class="hero-avatar-wrapper">
                        <img
                            :src="PUBLIC_PATH + 'images/placeholder-profile.svg'"
                            :alt="t('home-page.hero-placeholder-alt')"
                            class="hero-avatar"
                            width="340"
                            height="340"
                        />
                        <!-- Decorative rings -->
                        <div class="hero-ring hero-ring-1" aria-hidden="true" />
                        <div class="hero-ring hero-ring-2" aria-hidden="true" />
                    </div>
                </VCol>
            </VRow>
        </VContainer>
    </section>
</template>

<style scoped>
.hero-section {
    position: relative;
    overflow: hidden;
    min-height: 88vh;
    display: flex;
    align-items: center;
}

.hero-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        rgb(var(--v-theme-primary), 0.06) 0%,
        rgb(var(--v-theme-secondary), 0.04) 60%,
        transparent 100%
    );
    pointer-events: none;
}

/* Subtle mesh dots pattern */
.hero-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgb(var(--v-theme-primary), 0.07) 1px, transparent 1px);
    background-size: 28px 28px;
}

.hero-container {
    position: relative;
    z-index: 1;
}

.hero-title {
    background: linear-gradient(
        135deg,
        rgb(var(--v-theme-primary)) 0%,
        rgb(var(--v-theme-secondary)) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.15 !important;
}

.hero-avatar-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.hero-avatar {
    border-radius: 50%;
    object-fit: cover;
    position: relative;
    z-index: 1;
    box-shadow: 0 24px 64px rgb(var(--v-theme-primary), 0.25);
    animation: heroFloat 6s ease-in-out infinite;
}

.hero-ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid;
    opacity: 0.18;
    animation: heroRing 6s ease-in-out infinite;
}

.hero-ring-1 {
    inset: -18px;
    border-color: rgb(var(--v-theme-primary));
    animation-delay: 0s;
}

.hero-ring-2 {
    inset: -40px;
    border-color: rgb(var(--v-theme-secondary));
    animation-delay: 1.5s;
}

@keyframes heroFloat {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-12px);
    }
}

@keyframes heroRing {
    0%,
    100% {
        transform: scale(1);
        opacity: 0.18;
    }
    50% {
        transform: scale(1.04);
        opacity: 0.28;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeHero' };
</script>

<script setup lang="ts">
import { VBtn, VChip, VCol, VContainer, VRow } from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { PUBLIC_PATH } from '@/utils/constants';

const { t } = useI18n();

/*
 * @emits scrollTo - section element id to scroll to (use @scroll-to in templates)
 */
defineEmits<{ scrollTo: [id: string] }>();
</script>
