<template>
    <section id="home-contact" ref="el" class="contact-section py-16 py-md-24">
        <!-- Gradient backdrop -->
        <div class="contact-bg" aria-hidden="true" />

        <!-- Drifting aurora blobs -->
        <div class="contact-aurora contact-aurora-1" aria-hidden="true" />
        <div class="contact-aurora contact-aurora-2" aria-hidden="true" />

        <VContainer max-width="1280" class="contact-container">
            <div :class="['text-center reveal-block', { revealed: isVisible }]">
                <p class="section-eyebrow text-overline font-weight-bold text-primary mb-2">
                    {{ t('home-page.contact-eyebrow') }}
                </p>
                <h2 class="text-h4 text-md-h3 font-weight-black mb-5">
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

.contact-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        rgb(var(--v-theme-primary), 0.05) 0%,
        rgb(var(--v-theme-secondary), 0.04) 100%
    );
}

/* Drifting aurora blobs */
.contact-aurora {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.3;
    pointer-events: none;
    animation: contactAurora 20s ease-in-out infinite alternate;
}

.contact-aurora-1 {
    width: 440px;
    height: 440px;
    top: -140px;
    left: -120px;
    background: radial-gradient(circle, rgb(var(--v-theme-primary), 0.5), transparent 70%);
}

.contact-aurora-2 {
    width: 380px;
    height: 380px;
    bottom: -120px;
    right: -100px;
    background: radial-gradient(circle, rgb(var(--v-theme-secondary), 0.45), transparent 70%);
    animation-delay: -8s;
    animation-duration: 24s;
}

@keyframes contactAurora {
    0% {
        transform: translate(0, 0) scale(1);
    }
    100% {
        transform: translate(50px, -40px) scale(1.15);
    }
}

.contact-container {
    position: relative;
    z-index: 1;
}

.section-eyebrow {
    letter-spacing: 0.12em;
}

/* Pulsing glow on primary CTA */
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
    .contact-aurora,
    .contact-cta-glow {
        animation: none;
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
