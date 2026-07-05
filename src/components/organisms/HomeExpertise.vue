<template>
    <section id="home-expertise" ref="el" class="expertise-section py-16 py-md-24">
        <VContainer max-width="1280">
            <div :class="['reveal-block', { revealed: isVisible }]">
                <div class="text-center mb-12">
                    <p class="section-eyebrow text-overline font-weight-bold text-primary mb-2">
                        {{ t('home-page.expertise-eyebrow') }}
                    </p>
                    <h2 class="text-h4 text-md-h3 font-weight-black mb-4">
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
                        :style="{ transitionDelay: `${i * 80}ms` }"
                        :class="['pillar-col', { revealed: isVisible }]"
                    >
                        <VCard class="pillar-card h-100 pa-6" rounded="xl" variant="outlined" hover>
                            <VAvatar :color="pillar.color" size="52" rounded="lg" class="mb-5">
                                <VIcon :icon="pillar.icon" size="26" />
                            </VAvatar>
                            <h3 class="text-h6 font-weight-bold mb-3">
                                {{ t(pillar.titleKey) }}
                            </h3>
                            <p
                                class="text-body-2 text-medium-emphasis ma-0"
                                style="line-height: 1.7"
                            >
                                {{ t(pillar.descKey) }}
                            </p>
                        </VCard>
                    </VCol>
                </VRow>
            </div>
        </VContainer>
    </section>
</template>

<style scoped>
.expertise-section {
    position: relative;
    overflow: hidden;
    background: rgb(var(--v-theme-background));
}

/* Ambient corner glow */
.expertise-section::before {
    content: '';
    position: absolute;
    width: 460px;
    height: 460px;
    bottom: -180px;
    left: -160px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(var(--v-theme-primary), 0.12), transparent 70%);
    filter: blur(70px);
    pointer-events: none;
    animation: expertiseDrift 24s ease-in-out infinite alternate;
}

@keyframes expertiseDrift {
    to {
        transform: translate(80px, -60px) scale(1.2);
    }
}

.section-eyebrow {
    letter-spacing: 0.12em;
}

.pillar-card {
    position: relative;
    overflow: hidden;
    transition:
        transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 0.4s ease,
        border-color 0.4s ease;
    border-color: rgba(var(--v-border-color), 0.12);
}

/* Gradient beam sweeping along the top edge on hover */
.pillar-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
        90deg,
        rgb(var(--v-theme-primary)),
        rgb(var(--v-theme-secondary)),
        rgb(var(--v-theme-info)),
        rgb(var(--v-theme-primary))
    );
    background-size: 300% auto;
    opacity: 0;
    transition: opacity 0.4s ease;
    animation: pillarBeam 3s linear infinite;
}

@keyframes pillarBeam {
    to {
        background-position: 300% center;
    }
}

.pillar-card:hover {
    transform: translateY(-10px) rotate(-0.5deg);
    box-shadow: 0 22px 52px rgb(var(--v-theme-primary), 0.18);
    border-color: rgb(var(--v-theme-primary), 0.4);
}

.pillar-card:hover::before {
    opacity: 1;
}

/* Icon pop + wiggle on card hover */
.pillar-card :deep(.v-avatar) {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pillar-card:hover :deep(.v-avatar) {
    transform: scale(1.15) rotate(-6deg);
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
    .expertise-section::before,
    .pillar-card::before {
        animation: none;
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
import { VAvatar, VCard, VCol, VContainer, VIcon, VRow } from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();

/*
 * Six expertise pillars shown as cards.
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
