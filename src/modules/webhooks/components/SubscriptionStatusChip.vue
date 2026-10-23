<script setup lang="ts">
/**
 * @module
 * A subscription's status as one chip: enabled, paused by hand, or auto-disabled by the failure
 * guard. The wording and colour live here so the list and the detail page cannot drift.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ThemeColor } from '@/ui/types.ts';
import type { WebhookSubscription } from '@types';
import { subscriptionStatusOf, type SubscriptionStatus } from '../domain/subscription-status.ts';

/**
 * The subscription whose status to show.
 */
const { subscription } = defineProps<{
    subscription: Pick<WebhookSubscription, 'enabled' | 'autoDisabledAt'>;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Chip colour per state: green delivering, neutral on hold by choice, red switched off by failures.
 */
const STATUS_COLOR: Record<SubscriptionStatus, ThemeColor> = {
    enabled: 'success',
    paused: 'secondary',
    'auto-disabled': 'error'
};

/**
 * The state being shown.
 */
const status = computed(() => subscriptionStatusOf(subscription));
</script>

<template>
    <v-chip
        size="small"
        variant="tonal"
        :color="STATUS_COLOR[status]"
        data-test="webhook-status"
        :data-status="status"
    >
        {{ t(`webhook-status.${status}`) }}
    </v-chip>
</template>
