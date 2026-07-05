<template>
    <section id="home-services" ref="el" class="services-section py-16 py-md-24">
        <VContainer max-width="1280">
            <div :class="['reveal-block', { revealed: isVisible }]">
                <div class="text-center mb-12">
                    <p class="section-eyebrow text-overline font-weight-bold text-primary mb-2">
                        {{ t('home-page.services-eyebrow') }}
                    </p>
                    <h2 class="text-h4 text-md-h3 font-weight-black mb-4">
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
                        :style="{ transitionDelay: `${i * 100}ms` }"
                        :class="['service-col', { revealed: isVisible }]"
                    >
                        <VCard
                            :class="['service-card h-100 d-flex flex-column', { featured: pkg.featured }]"
                            :color="pkg.featured ? 'primary' : undefined"
                            :variant="pkg.featured ? 'flat' : 'outlined'"
                            rounded="xl"
                            hover
                        >
                            <VCardItem class="pa-6 pb-2">
                                <template #prepend>
                                    <VAvatar
                                        :color="pkg.featured ? 'white' : 'primary'"
                                        size="44"
                                        rounded="lg"
                                        class="mb-1"
                                    >
                                        <VIcon
                                            :icon="pkg.icon"
                                            size="22"
                                            :color="pkg.featured ? 'primary' : 'white'"
                                        />
                                    </VAvatar>
                                </template>
                                <VCardTitle class="text-h6 font-weight-bold pa-0 mb-1">
                                    {{ t(pkg.titleKey) }}
                                </VCardTitle>
                                <VCardSubtitle class="pa-0">
                                    <VChip size="x-small" :color="pkg.featured ? 'white' : 'primary'" variant="tonal">
                                        {{ t(pkg.durationKey) }}
                                    </VChip>
                                </VCardSubtitle>
                            </VCardItem>

                            <VCardText class="px-6 py-4 flex-grow-1 text-body-2" style="line-height: 1.7">
                                {{ t(pkg.descKey) }}
                            </VCardText>

                            <VCardActions class="px-6 pb-6">
                                <VBtn
                                    :color="pkg.featured ? 'white' : 'primary'"
                                    :variant="pkg.featured ? 'flat' : 'tonal'"
                                    rounded="lg"
                                    size="small"
                                    block
                                    append-icon="$arrowRight"
                                    @click="$emit('scrollTo', 'home-contact')"
                                >
                                    {{ t(pkg.ctaKey) }}
                                </VBtn>
                            </VCardActions>
                        </VCard>
                    </VCol>
                </VRow>
            </div>
        </VContainer>
    </section>
</template>

<style scoped>
.services-section {
    background: rgb(var(--v-theme-surface));
}

.section-eyebrow {
    letter-spacing: 0.12em;
}

.service-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border-color: rgba(var(--v-border-color), 0.12) !important;
}

.service-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 50px rgb(var(--v-theme-primary), 0.15) !important;
}

.service-card.featured {
    box-shadow: 0 8px 32px rgb(var(--v-theme-primary), 0.35) !important;
}

/* Entrance */
.reveal-block {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal-block.revealed {
    opacity: 1;
    transform: translateY(0);
}

.service-col {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.service-col.revealed {
    opacity: 1;
    transform: translateY(0);
}
</style>

<script lang="ts">
export default { name: 'HomeServices' };
</script>

<script setup lang="ts">
import {
    VAvatar,
    VBtn,
    VCard,
    VCardActions,
    VCardItem,
    VCardSubtitle,
    VCardText,
    VCardTitle,
    VChip,
    VCol,
    VContainer,
    VIcon,
    VRow
} from 'vuetify/components';
import { useI18n } from 'vue-i18n';
import { useScrollReveal } from '@/composables/useScrollReveal';

const { t } = useI18n();
const { el, isVisible } = useScrollReveal();

/*
 * @emits scrollTo - section element id to scroll to
 */
defineEmits<{ scrollTo: [id: string] }>();

/*
 * Service packages. featured = highlighted card with primary background.
 */
const packages = [
    {
        titleKey: 'home-page.services-1-title',
        durationKey: 'home-page.services-1-duration',
        descKey: 'home-page.services-1-description',
        ctaKey: 'home-page.services-1-cta',
        icon: '$briefcase',
        featured: false
    },
    {
        titleKey: 'home-page.services-2-title',
        durationKey: 'home-page.services-2-duration',
        descKey: 'home-page.services-2-description',
        ctaKey: 'home-page.services-2-cta',
        icon: '$wrench',
        featured: true
    },
    {
        titleKey: 'home-page.services-3-title',
        durationKey: 'home-page.services-3-duration',
        descKey: 'home-page.services-3-description',
        ctaKey: 'home-page.services-3-cta',
        icon: '$star',
        featured: false
    },
    {
        titleKey: 'home-page.services-4-title',
        durationKey: 'home-page.services-4-duration',
        descKey: 'home-page.services-4-description',
        ctaKey: 'home-page.services-4-cta',
        icon: '$robot',
        featured: false
    }
] as const;
</script>
