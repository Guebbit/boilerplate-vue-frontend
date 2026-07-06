<template>
    <section id="home-expertise" ref="el" class="expertise-section py-16 py-md-24">
        <!-- Decorative constellation: lines draw themselves on reveal -->
        <svg
            :class="['constellation', { drawn: isVisible }]"
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            <g class="constellation-lines">
                <path pathLength="1" d="M 120 120 L 380 90 L 640 160 L 920 100 L 1100 190" />
                <path pathLength="1" d="M 380 90 L 460 320 L 300 520" />
                <path pathLength="1" d="M 640 160 L 760 400 L 1020 480" />
                <path pathLength="1" d="M 460 320 L 760 400" />
                <path pathLength="1" d="M 920 100 L 1020 480" />
            </g>
            <g class="constellation-stars">
                <circle cx="120" cy="120" r="3" />
                <circle cx="380" cy="90" r="4" />
                <circle cx="640" cy="160" r="3" />
                <circle cx="920" cy="100" r="4" />
                <circle cx="1100" cy="190" r="3" />
                <circle cx="460" cy="320" r="3.5" />
                <circle cx="760" cy="400" r="4" />
                <circle cx="300" cy="520" r="3" />
                <circle cx="1020" cy="480" r="3.5" />
            </g>
        </svg>

        <VContainer max-width="1280" class="expertise-container">
            <div :class="['reveal-block', { revealed: isVisible }]">
                <div class="text-center mb-12">
                    <div class="chapter-marker justify-center mb-4">
                        <span class="chapter-number">02</span>
                        <span class="chapter-line" aria-hidden="true" />
                        <span class="section-eyebrow text-overline font-weight-bold">
                            {{ t('home-page.expertise-eyebrow') }}
                        </span>
                    </div>
                    <h2 class="expertise-title text-h4 text-md-h3 font-weight-black mb-4">
                        {{ t('home-page.expertise-title') }}
                    </h2>
                    <p class="text-body-1 text-medium-emphasis mx-auto" style="max-width: 640px">
                        {{ t('home-page.expertise-subtitle') }}
                    </p>
                </div>

                <VRow>
                    <VCol
                        v-for="(pillar, i) in pillars"
                        :key="pillar.titleKey"
                        cols="12"
                        sm="6"
                        lg="4"
                        :style="{ transitionDelay: `${i * 90}ms` }"
                        :class="['pillar-col', { revealed: isVisible }]"
                    >
                        <div class="star-node h-100 pa-6">
                            <!-- Star node marker -->
                            <span class="node-dot" :data-color="pillar.color" aria-hidden="true" />
                            <VAvatar
                                :color="pillar.color"
                                size="52"
                                rounded="lg"
                                class="node-avatar mb-5"
                                variant="tonal"
                            >
                                <VIcon :icon="pillar.icon" size="26" />
                            </VAvatar>
                            <h3 class="node-title text-h6 font-weight-bold mb-3">
                                {{ t(pillar.titleKey) }}
                            </h3>
                            <p
                                class="text-body-2 text-medium-emphasis ma-0"
                                style="line-height: 1.7"
                            >
                                {{ t(pillar.descKey) }}
                            </p>
                        </div>
                    </VCol>
                </VRow>
            </div>
        </VContainer>
    </section>
</template>

<style scoped>
.expertise-section {
    position: relative;
}

.expertise-container {
    position: relative;
    z-index: 1;
}

/* Constellation backdrop */
.constellation {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
}

.constellation-lines path {
    fill: none;
    stroke: rgba(115, 143, 255, 0.35);
    stroke-width: 1;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 2.4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
}

.constellation.drawn .constellation-lines path {
    stroke-dashoffset: 0;
}

.constellation-stars circle {
    fill: #cfd9ff;
    opacity: 0;
    transition: opacity 0.8s ease 1.6s;
    filter: drop-shadow(0 0 4px rgba(115, 143, 255, 0.9));
    animation: nodeTwinkle 4s ease-in-out infinite;
}

.constellation.drawn .constellation-stars circle {
    opacity: 0.9;
}

.constellation-stars circle:nth-child(2n) {
    animation-delay: -1.3s;
}

.constellation-stars circle:nth-child(3n) {
    animation-delay: -2.6s;
}

@keyframes nodeTwinkle {
    0%,
    100% {
        filter: drop-shadow(0 0 3px rgba(115, 143, 255, 0.6));
    }
    50% {
        filter: drop-shadow(0 0 8px rgba(115, 143, 255, 1));
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

.expertise-title {
    color: #eef2ff;
}

/* Star node card: dark Material surface anchored by a glowing node */
.star-node {
    position: relative;
    border-radius: 16px;
    background: rgba(14, 18, 38, 0.66);
    border: 1px solid rgba(115, 143, 255, 0.14);
    backdrop-filter: blur(8px);
    transition:
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.4s ease,
        box-shadow 0.4s ease,
        background-color 0.4s ease;
}

.star-node:hover {
    transform: translateY(-8px);
    border-color: rgba(115, 143, 255, 0.5);
    background: rgba(18, 24, 48, 0.82);
    box-shadow: 0 20px 52px rgba(115, 143, 255, 0.16);
}

/* Glowing node dot in the top-right corner — the card's "star" */
.node-dot {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(var(--v-theme-primary));
    box-shadow: 0 0 10px rgb(var(--v-theme-primary));
    animation: nodePulse 3s ease-in-out infinite;
}

.star-node:hover .node-dot {
    animation-duration: 1.2s;
}

@keyframes nodePulse {
    0%,
    100% {
        opacity: 0.6;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.4);
    }
}

.node-avatar {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.star-node:hover .node-avatar {
    transform: scale(1.12) rotate(-5deg);
}

.node-title {
    color: #eef2ff;
}

/* Staggered entrance */
.pillar-col {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
    transition:
        opacity 0.6s ease,
        transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.pillar-col.revealed {
    opacity: 1;
    transform: translateY(0) scale(1);
}

/* Reveal heading block */
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

@media (prefers-reduced-motion: reduce) {
    .constellation-lines path {
        transition: none;
        stroke-dashoffset: 0;
    }

    .constellation-stars circle {
        transition: none;
        opacity: 0.9;
        animation: none;
    }

    .node-dot,
    .node-avatar {
        animation: none;
        transition: none;
    }

    .reveal-block,
    .pillar-col {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeExpertise' };
</script>

<script setup lang="ts">
import { VAvatar, VCol, VContainer, VIcon, VRow } from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();

/*
 * Six expertise pillars shown as constellation star-nodes.
 * titleKey / descKey reference i18n keys in home-page namespace.
 */
const pillars = [
    {
        titleKey: 'home-page.expertise-1-title',
        descKey: 'home-page.expertise-1-description',
        icon: '$wrench',
        color: 'primary'
    },
    {
        titleKey: 'home-page.expertise-2-title',
        descKey: 'home-page.expertise-2-description',
        icon: '$code',
        color: 'secondary'
    },
    {
        titleKey: 'home-page.expertise-3-title',
        descKey: 'home-page.expertise-3-description',
        icon: '$robot',
        color: 'info'
    },
    {
        titleKey: 'home-page.expertise-4-title',
        descKey: 'home-page.expertise-4-description',
        icon: '$lightning',
        color: 'warning'
    },
    {
        titleKey: 'home-page.expertise-5-title',
        descKey: 'home-page.expertise-5-description',
        icon: '$briefcase',
        color: 'error'
    },
    {
        titleKey: 'home-page.expertise-6-title',
        descKey: 'home-page.expertise-6-description',
        icon: '$star',
        color: 'success'
    }
] as const;
</script>
