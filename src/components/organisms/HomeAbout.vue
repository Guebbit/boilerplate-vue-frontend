<template>
    <section id="home-about" ref="el" class="about-section py-16 py-md-24">
        <VContainer max-width="1280">
            <VRow align="center" justify="center" class="ga-8">
                <VCol cols="12" lg="10">
                    <div :class="['reveal-block', { revealed: isVisible }]">
                        <p class="section-eyebrow text-overline font-weight-bold text-primary mb-2">
                            {{ t('home-page.about-eyebrow') }}
                        </p>
                        <h2 class="about-title text-h4 text-md-h3 font-weight-black mb-6">
                            {{ t('home-page.about-title') }}
                        </h2>
                        <p
                            class="text-body-1 text-medium-emphasis mb-10"
                            style="max-width: 760px; line-height: 1.8"
                        >
                            {{ t('home-page.about-body') }}
                        </p>

                        <!-- Highlight stats -->
                        <VRow class="about-stats">
                            <VCol
                                v-for="(stat, i) in stats"
                                :key="stat.label"
                                cols="12"
                                sm="4"
                                :style="{ transitionDelay: `${i * 120}ms` }"
                                :class="['about-stat-col', { revealed: isVisible }]"
                            >
                                <VCard
                                    class="about-stat-card text-center pa-6"
                                    variant="tonal"
                                    color="primary"
                                    rounded="xl"
                                >
                                    <div class="text-h3 font-weight-black text-primary mb-1">
                                        {{ stat.value }}
                                    </div>
                                    <div
                                        class="text-body-2 text-medium-emphasis font-weight-medium"
                                    >
                                        {{ stat.label }}
                                    </div>
                                </VCard>
                            </VCol>
                        </VRow>
                    </div>
                </VCol>
            </VRow>
        </VContainer>
    </section>
</template>

<style scoped>
.about-section {
    position: relative;
    overflow: hidden;
    background: rgb(var(--v-theme-surface));
}

/* Faint drifting glow in the corner */
.about-section::before {
    content: '';
    position: absolute;
    width: 420px;
    height: 420px;
    top: -160px;
    right: -140px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(var(--v-theme-secondary), 0.14), transparent 70%);
    filter: blur(60px);
    pointer-events: none;
    animation: aboutDrift 20s ease-in-out infinite alternate;
}

@keyframes aboutDrift {
    to {
        transform: translate(-60px, 60px) scale(1.15);
    }
}

.section-eyebrow {
    letter-spacing: 0.12em;
}

/* Animated gradient underline under the title */
.about-title {
    position: relative;
    display: inline-block;
    padding-bottom: 8px;
}

.about-title::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    height: 4px;
    width: 96px;
    border-radius: 2px;
    background: linear-gradient(
        90deg,
        rgb(var(--v-theme-primary)),
        rgb(var(--v-theme-secondary)),
        rgb(var(--v-theme-primary))
    );
    background-size: 200% auto;
    animation: aboutUnderline 4s linear infinite;
}

@keyframes aboutUnderline {
    to {
        background-position: 200% center;
    }
}

.about-stat-card {
    position: relative;
    overflow: hidden;
    transition:
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 0.4s ease;
}

/* Shine sweep across the card on hover */
.about-stat-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: -80%;
    width: 50%;
    height: 100%;
    background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.25), transparent);
    transform: skewX(-20deg);
    transition: left 0.7s ease;
    pointer-events: none;
}

.about-stat-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 18px 44px rgb(var(--v-theme-primary), 0.25) !important;
}

.about-stat-card:hover::after {
    left: 130%;
}

/* Reveal animation */
.reveal-block {
    opacity: 0;
    transform: translateY(32px);
    transition:
        opacity 0.7s ease,
        transform 0.7s ease;
}

.reveal-block.revealed {
    opacity: 1;
    transform: translateY(0);
}

/* Staggered stat card entrance */
.about-stat-col {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
    transition:
        opacity 0.6s ease,
        transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.about-stat-col.revealed {
    opacity: 1;
    transform: translateY(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
    .about-section::before,
    .about-title::after {
        animation: none;
    }

    .reveal-block,
    .about-stat-col {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeAbout' };
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { VCard, VCol, VContainer, VRow } from 'vuetify/components';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();

/*
 * Stats shown as highlight cards below the about text.
 */
const stats = computed(() => [
    {
        value: t('home-page.about-highlight-1-value'),
        label: t('home-page.about-highlight-1-label')
    },
    {
        value: t('home-page.about-highlight-2-value'),
        label: t('home-page.about-highlight-2-label')
    },
    { value: t('home-page.about-highlight-3-value'), label: t('home-page.about-highlight-3-label') }
]);
</script>
