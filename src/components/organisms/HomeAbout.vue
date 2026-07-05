<template>
    <section id="home-about" ref="el" class="about-section py-16 py-md-24">
        <VContainer max-width="1280">
            <VRow align="center" justify="center" class="ga-8">
                <VCol cols="12" lg="10">
                    <div :class="['reveal-block', { revealed: isVisible }]">
                        <p class="section-eyebrow text-overline font-weight-bold text-primary mb-2">
                            {{ t('home-page.about-eyebrow') }}
                        </p>
                        <h2 class="text-h4 text-md-h3 font-weight-black mb-6">
                            {{ t('home-page.about-title') }}
                        </h2>
                        <p class="text-body-1 text-medium-emphasis mb-10" style="max-width: 760px; line-height: 1.8">
                            {{ t('home-page.about-body') }}
                        </p>

                        <!-- Highlight stats -->
                        <VRow class="about-stats">
                            <VCol
                                v-for="stat in stats"
                                :key="stat.label"
                                cols="12"
                                sm="4"
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
                                    <div class="text-body-2 text-medium-emphasis font-weight-medium">
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
    background: rgb(var(--v-theme-surface));
}

.section-eyebrow {
    letter-spacing: 0.12em;
}

.about-stat-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.about-stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgb(var(--v-theme-primary), 0.18) !important;
}

/* Reveal animation */
.reveal-block {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.7s ease, transform 0.7s ease;
}

.reveal-block.revealed {
    opacity: 1;
    transform: translateY(0);
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
    { value: t('home-page.about-highlight-1-value'), label: t('home-page.about-highlight-1-label') },
    { value: t('home-page.about-highlight-2-value'), label: t('home-page.about-highlight-2-label') },
    { value: t('home-page.about-highlight-3-value'), label: t('home-page.about-highlight-3-label') }
]);
</script>
