<template>
    <section id="home-contact" ref="el" class="contact-section py-16 py-md-24">
        <!-- Radar ping: expanding signal rings behind the beacon -->
        <div class="signal-field" aria-hidden="true">
            <div class="signal-ring signal-ring-1" />
            <div class="signal-ring signal-ring-2" />
            <div class="signal-ring signal-ring-3" />
            <div class="signal-core" />
        </div>

        <VContainer max-width="1280" class="contact-container">
            <div :class="['text-center reveal-block', { revealed: isVisible }]">
                <div class="chapter-marker justify-center mb-4">
                    <span class="chapter-number">04</span>
                    <span class="chapter-line" aria-hidden="true" />
                    <span class="section-eyebrow text-overline font-weight-bold">
                        {{ t('home-page.contact-eyebrow') }}
                    </span>
                </div>
                <h2 class="contact-title text-h4 text-md-h3 font-weight-black mb-5">
                    {{ t('home-page.contact-title') }}
                </h2>
                <p
                    class="text-body-1 text-medium-emphasis mx-auto mb-10"
                    style="max-width: 560px; line-height: 1.7"
                >
                    {{ t('home-page.contact-description') }}
                </p>

                <!-- Primary CTAs -->
                <div class="d-flex flex-wrap justify-center ga-4 mb-12">
                    <VBtn
                        class="contact-cta-glow"
                        color="primary"
                        size="large"
                        rounded="xl"
                        elevation="4"
                        :href="'mailto:' + t('home-page.contact-email')"
                        prepend-icon="$email"
                    >
                        {{ t('home-page.contact-cta-primary') }}
                    </VBtn>
                    <VBtn
                        variant="outlined"
                        color="primary"
                        size="large"
                        rounded="xl"
                        :href="'mailto:' + t('home-page.contact-email')"
                        prepend-icon="$email"
                    >
                        {{ t('home-page.contact-cta-secondary') }}
                    </VBtn>
                </div>

                <!-- Social links -->
                <div class="contact-socials d-flex justify-center ga-4">
                    <VBtn
                        :href="'https://' + t('home-page.contact-github')"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="tonal"
                        color="primary"
                        icon="$github"
                        size="large"
                        rounded="lg"
                        aria-label="GitHub"
                    />
                    <VBtn
                        :href="'https://' + t('home-page.contact-linkedin')"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="tonal"
                        color="secondary"
                        icon="$linkedin"
                        size="large"
                        rounded="lg"
                        aria-label="LinkedIn"
                    />
                    <VBtn
                        :href="'mailto:' + t('home-page.contact-email')"
                        variant="tonal"
                        color="info"
                        icon="$email"
                        size="large"
                        rounded="lg"
                        :aria-label="t('home-page.contact-email')"
                    />
                </div>
            </div>
        </VContainer>
    </section>
</template>

<style scoped>
.contact-section {
    position: relative;
    overflow: hidden;
}

.contact-container {
    position: relative;
    z-index: 1;
}

/* Signal field: concentric rings expanding from a glowing core */
.signal-field {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.signal-core {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgb(var(--v-theme-tertiary));
    box-shadow: 0 0 24px rgb(var(--v-theme-tertiary));
    animation: corePulse 3s ease-in-out infinite;
}

@keyframes corePulse {
    0%,
    100% {
        opacity: 0.5;
        transform: scale(1);
    }
    50% {
        opacity: 1;
        transform: scale(1.5);
    }
}

.signal-ring {
    position: absolute;
    width: 120px;
    height: 120px;
    border: 1px solid rgba(77, 208, 225, 0.5);
    border-radius: 50%;
    opacity: 0;
    animation: signalPing 6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.signal-ring-2 {
    animation-delay: 2s;
}

.signal-ring-3 {
    animation-delay: 4s;
}

@keyframes signalPing {
    0% {
        opacity: 0.7;
        transform: scale(0.3);
    }
    100% {
        opacity: 0;
        transform: scale(8);
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

.contact-title {
    color: #eef2ff;
}

/* Pulsing glow on primary CTA — the transmission beacon */
.contact-cta-glow {
    animation: contactCtaPulse 3s ease-in-out infinite;
}

@keyframes contactCtaPulse {
    0%,
    100% {
        box-shadow: 0 4px 20px rgb(var(--v-theme-primary), 0.35);
    }
    50% {
        box-shadow: 0 8px 36px rgb(var(--v-theme-primary), 0.6);
    }
}

/* Social buttons pop up on hover */
.contact-socials :deep(.v-btn) {
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.contact-socials :deep(.v-btn:hover) {
    transform: translateY(-6px) scale(1.08);
}

.reveal-block {
    opacity: 0;
    transform: translateY(28px);
    transition:
        opacity 0.7s ease,
        transform 0.7s ease;
}

.reveal-block.revealed {
    opacity: 1;
    transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
    .signal-core,
    .signal-ring,
    .contact-cta-glow {
        animation: none;
    }

    .signal-ring {
        opacity: 0.25;
        transform: scale(3);
    }

    .reveal-block {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
</style>

<script lang="ts">
export default { name: 'HomeContact' };
</script>

<script setup lang="ts">
import { VBtn, VContainer } from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();
</script>
