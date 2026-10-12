<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PaymentStatusChip'
};
</script>

<script setup lang="ts">
/**
 * @module
 * A payment's `displayStatus` as a coloured chip. The label is the server's derived status (what a
 * Stripe-style list shows), never recomputed from `status` and `amountRefunded` here: a refund still
 * pending would read as done from the amounts alone.
 */
import { useI18n } from 'vue-i18n';
import type { PaymentDisplayStatus } from '@types';

/**
 * The status to show.
 */
defineProps<{
    /** `Payment.displayStatus`. */
    status: PaymentDisplayStatus;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Theme colour per status. `satisfies` makes a status added to the contract fail the type check
 * instead of rendering grey.
 */
const COLORS = {
    incomplete: 'warning',
    pending: 'info',
    succeeded: 'success',
    refund_pending: 'warning',
    partially_refunded: 'secondary',
    refunded: 'secondary',
    failed: 'error'
} satisfies Record<PaymentDisplayStatus, string>;
</script>

<template>
    <v-chip size="small" variant="tonal" :color="COLORS[status]" data-test="payment-status">
        {{ t(`payments-list-page.display-status-${status}`) }}
    </v-chip>
</template>
