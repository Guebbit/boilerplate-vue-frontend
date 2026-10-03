<script setup lang="ts">
/**
 * @module
 * The guest analytics-consent banner, pinned to the bottom edge: shown while the choice is
 * `unknown`, or after the footer's "privacy choices" link reopens it, and only when Umami is
 * configured. Accept/Decline both persist
 * through `useAnalyticsConsentStore`, which the http layer's `onRequest` interceptor reads to
 * decide whether an anonymous request carries `X-Analytics-Consent`.
 */
import { useI18n } from 'vue-i18n';
import {
    useAnalyticsConsentStore,
    isAnalyticsConsentEnabled
} from '@/infrastructure/analytics-consent.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The guest consent store — its `promptOpen` decides whether this banner shows at all. Read directly
 * rather than through `storeToRefs`: the template's own reactive access to a Pinia store's state
 * is enough, and this is the only property this component reads.
 */
const consent = useAnalyticsConsentStore();
</script>

<template>
    <!--
        Pinned to the bottom edge, not placed in the page flow: a `v-alert` in the flow slides
        under the fixed app bar, and the footer's "Privacy choices" link has to show the banner
        wherever on the page the visitor clicked it. The opaque wrapper keeps the tonal alert
        readable over whatever scrolls beneath.
    -->
    <div
        v-if="isAnalyticsConsentEnabled() && consent.promptOpen"
        class="bg-surface position-fixed bottom-0 left-0 right-0 elevation-8"
        style="z-index: 2000"
    >
        <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="rounded-0"
            role="region"
            :aria-label="t('analytics-consent.banner-label')"
            data-test="analytics-consent-banner"
        >
            {{ t('analytics-consent.message') }}
            <template #append>
                <div class="flex gap-2">
                    <v-btn
                        variant="text"
                        size="small"
                        data-test="analytics-consent-decline"
                        @click="consent.deny()"
                    >
                        {{ t('analytics-consent.button-decline') }}
                    </v-btn>
                    <v-btn
                        variant="flat"
                        color="primary"
                        size="small"
                        data-test="analytics-consent-accept"
                        @click="consent.grant()"
                    >
                        {{ t('analytics-consent.button-accept') }}
                    </v-btn>
                </div>
            </template>
        </v-alert>
    </div>
</template>
