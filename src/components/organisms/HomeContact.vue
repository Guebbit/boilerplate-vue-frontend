<template>
    <section id="home-contact" ref="el" class="contact-section py-16 py-md-24">
        <!-- Gradient backdrop -->
        <div class="contact-bg" aria-hidden="true" />

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
                <div class="d-flex justify-center ga-4">
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

.contact-container {
    position: relative;
    z-index: 1;
}

.section-eyebrow {
    letter-spacing: 0.12em;
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
