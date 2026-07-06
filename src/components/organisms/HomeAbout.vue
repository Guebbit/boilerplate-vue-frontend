<template>
    <section id="home-about" ref="el" class="about-section py-16 py-md-24">
        <VContainer max-width="1280">
            <VRow align="center" justify="center">
                <VCol cols="12" lg="10">
                    <div :class="['reveal-block', { revealed: isVisible }]">
                        <!-- Chapter marker -->
                        <div class="chapter-marker mb-6">
                            <span class="chapter-number">01</span>
                            <span class="chapter-line" aria-hidden="true" />
                            <span class="section-eyebrow text-overline font-weight-bold">
                                {{ t('home-page.about-eyebrow') }}
                            </span>
                        </div>

                        <h2 class="about-title text-h4 text-md-h3 font-weight-black mb-6">
                            {{ t('home-page.about-title') }}
                        </h2>
                        <p
                            class="text-body-1 text-medium-emphasis mb-12"
                            style="max-width: 760px; line-height: 1.8"
                        >
                            {{ t('home-page.about-body') }}
                        </p>

                        <!-- Telemetry readouts: instrumentation-style stat modules -->
                        <VRow class="about-stats">
                            <VCol
                                v-for="(stat, i) in stats"
                                :key="stat.label"
                                cols="12"
                                sm="4"
                                :style="{ transitionDelay: `${i * 140}ms` }"
                                :class="['telemetry-col', { revealed: isVisible }]"
                            >
                                <div class="telemetry-panel pa-6 text-center">
                                    <!-- Gauge arc draws itself on reveal -->
                                    <svg
                                        class="telemetry-gauge mb-4"
                                        viewBox="0 0 120 66"
                                        aria-hidden="true"
                                    >
                                        <path
                                            class="gauge-track"
                                            d="M 10 60 A 50 50 0 0 1 110 60"
                                        />
                                        <path
                                            :class="['gauge-value', { drawn: isVisible }]"
                                            d="M 10 60 A 50 50 0 0 1 110 60"
                                            :style="{ transitionDelay: `${300 + i * 140}ms` }"
                                        />
                                        <circle
                                            :class="['gauge-dot', { drawn: isVisible }]"
                                            cx="60"
                                            cy="10"
                                            r="3"
                                            :style="{ transitionDelay: `${900 + i * 140}ms` }"
                                        />
                                    </svg>
                                    <div class="telemetry-value text-h3 font-weight-black mb-1">
                                        {{ stat.value }}
                                    </div>
                                    <div
                                        class="telemetry-label text-body-2 text-medium-emphasis font-weight-medium text-uppercase"
                                    >
                                        {{ stat.label }}
                                    </div>
                                </div>
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
}

/* Chapter marker: number + expanding rule + eyebrow */
.chapter-marker {
    display: flex;
    align-items: center;
    gap: 16px;
}

.chapter-number {
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: rgb(var(--v-theme-primary));
    opacity: 0.9;
}

.chapter-line {
    display: inline-block;
    height: 1px;
    width: 64px;
    background: linear-gradient(90deg, rgb(var(--v-theme-primary), 0.8), transparent);
    transform-origin: left;
    animation: chapterLine 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes chapterLine {
    from {
        transform: scaleX(0);
    }
    to {
        transform: scaleX(1);
    }
}

.section-eyebrow {
    letter-spacing: 0.18em;
    color: rgb(var(--v-theme-primary));
}

.about-title {
    color: #eef2ff;
}

/* Telemetry panel: dark instrument surface with HUD corner brackets */
.telemetry-panel {
    position: relative;
    border-radius: 16px;
    background: rgba(14, 18, 38, 0.72);
    border: 1px solid rgba(115, 143, 255, 0.16);
    backdrop-filter: blur(8px);
    transition:
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.4s ease,
        box-shadow 0.4s ease;
}

/* Corner brackets — subtle scientific-instrument framing */
.telemetry-panel::before,
.telemetry-panel::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-color: rgba(115, 143, 255, 0.55);
    border-style: solid;
    transition: border-color 0.4s ease;
}

.telemetry-panel::before {
    top: 8px;
    left: 8px;
    border-width: 1.5px 0 0 1.5px;
}

.telemetry-panel::after {
    bottom: 8px;
    right: 8px;
    border-width: 0 1.5px 1.5px 0;
}

.telemetry-panel:hover {
    transform: translateY(-6px);
    border-color: rgba(115, 143, 255, 0.45);
    box-shadow: 0 18px 48px rgba(115, 143, 255, 0.15);
}

.telemetry-panel:hover::before,
.telemetry-panel:hover::after {
    border-color: rgb(var(--v-theme-primary));
}

/* Gauge arc */
.telemetry-gauge {
    width: 120px;
    height: 66px;
}

.gauge-track {
    fill: none;
    stroke: rgba(115, 143, 255, 0.15);
    stroke-width: 3;
    stroke-linecap: round;
}

.gauge-value {
    fill: none;
    stroke: rgb(var(--v-theme-primary));
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 158;
    stroke-dashoffset: 158;
    transition: stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1);
    filter: drop-shadow(0 0 4px rgb(var(--v-theme-primary), 0.6));
}

.gauge-value.drawn {
    stroke-dashoffset: 32;
}

.gauge-dot {
    fill: rgb(var(--v-theme-tertiary));
    opacity: 0;
    transition: opacity 0.5s ease;
    filter: drop-shadow(0 0 6px rgb(var(--v-theme-tertiary)));
}

.gauge-dot.drawn {
    opacity: 1;
}

.telemetry-value {
    color: #eef2ff;
    letter-spacing: 0.02em;
}

.telemetry-label {
    letter-spacing: 0.14em;
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

/* Staggered telemetry entrance */
.telemetry-col {
    opacity: 0;
    transform: translateY(24px) scale(0.97);
    transition:
        opacity 0.6s ease,
        transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.telemetry-col.revealed {
    opacity: 1;
    transform: translateY(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
    .chapter-line {
        animation: none;
    }

    .reveal-block,
    .telemetry-col {
        opacity: 1;
        transform: none;
        transition: none;
    }

    .gauge-value {
        transition: none;
        stroke-dashoffset: 32;
    }

    .gauge-dot {
        transition: none;
        opacity: 1;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeAbout' };
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { VCol, VContainer, VRow } from 'vuetify/components';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();

/*
 * Stats shown as telemetry readout modules below the about text.
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
    {
        value: t('home-page.about-highlight-3-value'),
        label: t('home-page.about-highlight-3-label')
    }
]);
</script>
