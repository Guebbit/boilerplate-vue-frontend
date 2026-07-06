<template>
    <section id="home-services" ref="el" class="services-section py-16 py-md-24">
        <!-- Orbital plane: slow rotating rings behind the content -->
        <div class="orbital-plane" aria-hidden="true">
            <div class="orbital-ring orbital-ring-1" />
            <div class="orbital-ring orbital-ring-2" />
            <div class="orbital-ring orbital-ring-3" />
        </div>

        <VContainer max-width="1280" class="services-container">
            <div :class="['reveal-block', { revealed: isVisible }]">
                <div class="text-center mb-12">
                    <div class="chapter-marker justify-center mb-4">
                        <span class="chapter-number">03</span>
                        <span class="chapter-line" aria-hidden="true" />
                        <span class="section-eyebrow text-overline font-weight-bold">
                            {{ t('home-page.services-eyebrow') }}
                        </span>
                    </div>
                    <h2 class="services-title text-h4 text-md-h3 font-weight-black mb-4">
                        {{ t('home-page.services-title') }}
                    </h2>
                    <p class="text-body-1 text-medium-emphasis mx-auto" style="max-width: 600px">
                        {{ t('home-page.services-subtitle') }}
                    </p>
                </div>

                <VRow justify="center">
                    <VCol
                        v-for="(pkg, i) in packages"
                        :key="pkg.titleKey"
                        cols="12"
                        sm="6"
                        lg="3"
                        :style="{ transitionDelay: `${i * 110}ms` }"
                        :class="['service-col', { revealed: isVisible }]"
                    >
                        <div
                            :class="[
                                'orbital-station h-100 d-flex flex-column pa-6',
                                { featured: pkg.featured }
                            ]"
                        >
                            <!-- Planet sphere: CSS-lit body, featured one carries a ring -->
                            <div class="planet-wrap mb-5" aria-hidden="true">
                                <div :class="['planet', `planet-${pkg.planet}`]">
                                    <VIcon :icon="pkg.icon" size="20" class="planet-icon" />
                                </div>
                                <div v-if="pkg.featured" class="planet-ring" />
                            </div>

                            <h3 class="station-title text-h6 font-weight-bold mb-1">
                                {{ t(pkg.titleKey) }}
                            </h3>
                            <VChip
                                size="x-small"
                                :color="pkg.featured ? 'tertiary' : 'primary'"
                                variant="tonal"
                                class="align-self-start mb-3"
                            >
                                {{ t(pkg.durationKey) }}
                            </VChip>

                            <p
                                class="text-body-2 text-medium-emphasis flex-grow-1 mb-5"
                                style="line-height: 1.7"
                            >
                                {{ t(pkg.descKey) }}
                            </p>

                            <VBtn
                                :color="pkg.featured ? 'tertiary' : 'primary'"
                                :variant="pkg.featured ? 'flat' : 'tonal'"
                                rounded="lg"
                                size="small"
                                block
                                append-icon="$arrowRight"
                                @click="$emit('scrollTo', 'home-contact')"
                            >
                                {{ t(pkg.ctaKey) }}
                            </VBtn>
                        </div>
                    </VCol>
                </VRow>
            </div>
        </VContainer>
    </section>
</template>

<style scoped>
.services-section {
    position: relative;
    overflow: hidden;
}

.services-container {
    position: relative;
    z-index: 1;
}

/* Orbital plane: three elliptical rings rotating at different periods */
.orbital-plane {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0.35;
}

.orbital-ring {
    position: absolute;
    border: 1px solid rgba(115, 143, 255, 0.3);
    border-radius: 50%;
    transform-style: preserve-3d;
}

.orbital-ring::after {
    content: '';
    position: absolute;
    top: -3px;
    left: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgb(var(--v-theme-tertiary));
    box-shadow: 0 0 8px rgb(var(--v-theme-tertiary));
}

.orbital-ring-1 {
    width: 640px;
    height: 640px;
    animation: orbitSpin 60s linear infinite;
}

.orbital-ring-2 {
    width: 940px;
    height: 940px;
    border-color: rgba(187, 134, 252, 0.22);
    animation: orbitSpin 95s linear infinite reverse;
}

.orbital-ring-2::after {
    background: rgb(var(--v-theme-secondary));
    box-shadow: 0 0 8px rgb(var(--v-theme-secondary));
}

.orbital-ring-3 {
    width: 1280px;
    height: 1280px;
    border-color: rgba(115, 143, 255, 0.14);
    animation: orbitSpin 140s linear infinite;
}

@keyframes orbitSpin {
    to {
        transform: rotate(360deg);
    }
}

/* Chapter marker */
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
}

.chapter-line {
    display: inline-block;
    height: 1px;
    width: 64px;
    background: linear-gradient(90deg, rgb(var(--v-theme-primary), 0.8), transparent);
}

.section-eyebrow {
    letter-spacing: 0.18em;
    color: rgb(var(--v-theme-primary));
}

.services-title {
    color: #eef2ff;
}

/* Orbital station: dark Material surface */
.orbital-station {
    position: relative;
    border-radius: 16px;
    background: rgba(14, 18, 38, 0.72);
    border: 1px solid rgba(115, 143, 255, 0.14);
    backdrop-filter: blur(8px);
    transition:
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.4s ease,
        box-shadow 0.4s ease;
}

.orbital-station:hover {
    transform: translateY(-8px);
    border-color: rgba(115, 143, 255, 0.5);
    box-shadow: 0 22px 56px rgba(115, 143, 255, 0.18);
}

.orbital-station.featured {
    border-color: rgba(77, 208, 225, 0.4);
    animation: stationGlow 4.5s ease-in-out infinite;
}

@keyframes stationGlow {
    0%,
    100% {
        box-shadow: 0 8px 32px rgba(77, 208, 225, 0.16);
    }
    50% {
        box-shadow: 0 12px 44px rgba(77, 208, 225, 0.34);
    }
}

/* Planet spheres — CSS-lit bodies, one hue per package */
.planet-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.planet {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
        inset -8px -6px 14px rgba(0, 0, 0, 0.55),
        inset 4px 4px 10px rgba(255, 255, 255, 0.18);
    transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.orbital-station:hover .planet {
    transform: scale(1.12) rotate(8deg);
}

.planet-icon {
    color: rgba(255, 255, 255, 0.92);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.planet-indigo {
    background: radial-gradient(circle at 32% 28%, #8fa4ff, #4a5af5 55%, #232c8a);
}

.planet-cyan {
    background: radial-gradient(circle at 32% 28%, #8ee9f5, #00bcd4 55%, #045f6b);
}

.planet-violet {
    background: radial-gradient(circle at 32% 28%, #d9b3f0, #9b59b6 55%, #4d2564);
}

.planet-amber {
    background: radial-gradient(circle at 32% 28%, #ffd18a, #fb8c00 55%, #7a4200);
}

/* Saturn-like ring on the featured planet */
.planet-ring {
    position: absolute;
    inset: 50% auto auto 50%;
    width: 82px;
    height: 26px;
    border: 2px solid rgba(77, 208, 225, 0.55);
    border-radius: 50%;
    transform: translate(-50%, -50%) rotate(-18deg);
    animation: planetRingTilt 7s ease-in-out infinite;
    pointer-events: none;
}

@keyframes planetRingTilt {
    0%,
    100% {
        transform: translate(-50%, -50%) rotate(-18deg);
    }
    50% {
        transform: translate(-50%, -50%) rotate(-10deg);
    }
}

.station-title {
    color: #eef2ff;
}

/* Entrance */
.reveal-block {
    opacity: 0;
    transform: translateY(24px);
    transition:
        opacity 0.6s ease,
        transform 0.6s ease;
}

.reveal-block.revealed {
    opacity: 1;
    transform: translateY(0);
}

.service-col {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
    transition:
        opacity 0.6s ease,
        transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.service-col.revealed {
    opacity: 1;
    transform: translateY(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
    .orbital-ring,
    .orbital-station.featured,
    .planet-ring {
        animation: none;
    }

    .planet {
        transition: none;
    }

    .reveal-block,
    .service-col {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeServices' };
</script>

<script setup lang="ts">
import { VBtn, VChip, VCol, VContainer, VIcon, VRow } from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();

/*
 * @emits scrollTo - section element id to scroll to (use @scroll-to in templates)
 */
defineEmits<{ scrollTo: [id: string] }>();

/*
 * Service packages as planets of the orbital system.
 * featured = ringed planet with pulsing glow. planet = CSS sphere hue.
 */
const packages = [
    {
        titleKey: 'home-page.services-1-title',
        durationKey: 'home-page.services-1-duration',
        descKey: 'home-page.services-1-description',
        ctaKey: 'home-page.services-1-cta',
        icon: '$briefcase',
        planet: 'indigo',
        featured: false
    },
    {
        titleKey: 'home-page.services-2-title',
        durationKey: 'home-page.services-2-duration',
        descKey: 'home-page.services-2-description',
        ctaKey: 'home-page.services-2-cta',
        icon: '$wrench',
        planet: 'cyan',
        featured: true
    },
    {
        titleKey: 'home-page.services-3-title',
        durationKey: 'home-page.services-3-duration',
        descKey: 'home-page.services-3-description',
        ctaKey: 'home-page.services-3-cta',
        icon: '$star',
        planet: 'violet',
        featured: false
    },
    {
        titleKey: 'home-page.services-4-title',
        durationKey: 'home-page.services-4-duration',
        descKey: 'home-page.services-4-description',
        ctaKey: 'home-page.services-4-cta',
        icon: '$robot',
        planet: 'amber',
        featured: false
    }
] as const;
</script>
