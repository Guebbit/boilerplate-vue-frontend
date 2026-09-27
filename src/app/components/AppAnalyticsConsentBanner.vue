<script setup lang="ts">
/**
 * @module
 * FA-D5's guest analytics-consent banner: shown once per visitor while their choice is `unknown`,
 * and only at all when `VITE_ANALYTICS_GUEST_CONSENT` turns the feature on — the demo, and any
 * deployment that has not decided it needs this, ship with it off. Accept/Decline both persist
 * through `useAnalyticsConsentStore`, which the http layer's `onRequest` interceptor reads to
 * decide whether an anonymous request carries `X-Analytics-Consent`.
 */
import { useI18n } from 'vue-i18n';
import {
    useAnalyticsConsentStore,
    isAnalyticsGuestConsentEnabled
} from '@/infrastructure/analytics-consent.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The guest consent store — its `choice` decides whether this banner shows at all. Read directly
 * rather than through `storeToRefs`: the template's own reactive access to a Pinia store's state
 * is enough, and this is the only property this component reads.
 */
const consent = useAnalyticsConsentStore();
</script>

<template>
    <v-alert
        v-if="isAnalyticsGuestConsentEnabled() && consent.choice === 'unknown'"
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
</template>
