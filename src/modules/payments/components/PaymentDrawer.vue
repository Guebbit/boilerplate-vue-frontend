<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PaymentDrawer'
};
</script>

<script setup lang="ts">
/**
 * @module
 * A payment's side drawer: what the list row has no room for — its refunds, the provider
 * references and the card's last digits — and the actions the server allows. The provider ids and
 * a refund's failure reason arrive only for a caller holding `display:Payment`, so this renders
 * them whenever they are present and never asks who is looking. Refunding is the existing
 * `POST /payments/order/{orderId}/refund`, offered only when `actions.refund` says it would work.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { Payment } from '@types';
import { usePaymentsStore } from '../store.ts';
import PaymentStatusChip from './PaymentStatusChip.vue';

/**
 * The payment to show, and the open state.
 */
const props = defineProps<{
    /** The payment the drawer is about; `undefined` while none is picked. */
    payment?: Payment;
}>();

/**
 * Whether the drawer is open.
 */
const open = defineModel<boolean>({ default: false });

// A drawer has no activator: hand focus back to the row that opened it on close (WAI-ARIA APG
// dialog pattern). A row the reload has since replaced is gone, and focus is left alone.
useReturnFocus(() => open.value);

/**
 * Emitted after a refund went through, so the list reloads what the drawer changed.
 */
const emit = defineEmits<
    /**
     * The payment's money moved.
     */
    (event: 'changed') => void
>();

/**
 * Translation function and toast dispatcher.
 */
const { t } = useI18n();

/**
 * Toast dispatcher for the refund's outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The router, for the order link's `hasRoute` guard.
 */
const router = useRouter();

/**
 * The store whose `refundForOrder` this drawer calls.
 */
const store = usePaymentsStore();

/**
 * The refund's own blocked state: the confirm dialog that gates it has closed by the time the
 * request answers, so a failure renders in the drawer rather than as a toast that fades.
 */
const {
    message: refundError,
    report: reportRefundError,
    clear: clearRefundError
} = useBlockingError();

/**
 * True while the refund request is out, to block a double click.
 */
const refunding = ref(false);

/**
 * The order's own page — where partial refunds and the offline form live — or nothing when this
 * build ships no `orders` module.
 */
const orderEditLink = computed(() => {
    const target = props.payment
        ? linkIfRouted(router, 'OrderEdit', { id: props.payment.orderId })
        : undefined;
    return target ? routerLinkI18n(target) : undefined;
});

/**
 * Refunds everything still refundable, after an explicit confirmation.
 *
 * @returns A promise settling once the viewer answered and, if they accepted, the refund finished;
 *  a failure is shown in the drawer.
 */
const handleRefund = () => {
    const current = props.payment;
    if (!current) return Promise.resolve();
    return useDialogStore()
        .confirm({
            message: t('payments-list-page.confirm-refund', {
                order: current.orderNumber ?? current.orderId
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRefundError();
            refunding.value = true;
            return store
                .refundForOrder(current.orderId)
                .then(() => {
                    addMessage(t('payments-list-page.refund-done'));
                    emit('changed');
                    open.value = false;
                })
                .catch((error: unknown) => reportRefundError(error))
                .finally(() => {
                    refunding.value = false;
                });
        });
};
</script>

<template>
    <v-navigation-drawer
        v-model="open"
        temporary
        location="end"
        width="440"
        :aria-label="t('payments-list-page.drawer-label')"
        data-test="payment-drawer"
        @keydown.esc="open = false"
    >
        <div v-if="payment" class="p-4">
            <div class="mb-4 flex items-center gap-2">
                <h2 class="text-lg font-semibold">
                    {{ formatCurrency(payment.amount, payment.currency) }}
                </h2>
                <PaymentStatusChip :status="payment.displayStatus" />
                <v-spacer />
                <v-btn
                    icon
                    variant="text"
                    size="small"
                    :aria-label="t('payments-list-page.button-close')"
                    data-test="drawer-close"
                    @click="open = false"
                >
                    <span aria-hidden="true">×</span>
                </v-btn>
            </div>

            <dl class="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt class="opacity-70">{{ t('payments-list-page.column-order') }}</dt>
                <dd>{{ payment.orderNumber ?? payment.orderId }}</dd>
                <dt class="opacity-70">{{ t('payments-list-page.column-email') }}</dt>
                <dd>{{ payment.email ?? EMPTY_VALUE }}</dd>
                <dt class="opacity-70">{{ t('payments-list-page.column-method') }}</dt>
                <dd>{{ t(`payments-list-page.method-${payment.method}`) }}</dd>
                <dt class="opacity-70">{{ t('payments-list-page.column-provider') }}</dt>
                <dd>{{ payment.provider }}</dd>
                <template v-if="payment.providerRef">
                    <dt class="opacity-70">{{ t('payments-list-page.label-provider-ref') }}</dt>
                    <dd data-test="drawer-provider-ref">
                        <code class="text-xs">{{ payment.providerRef }}</code>
                    </dd>
                </template>
                <template v-if="payment.cardLast4">
                    <dt class="opacity-70">{{ t('payments-list-page.label-card') }}</dt>
                    <dd>•••• {{ payment.cardLast4 }}</dd>
                </template>
                <template v-if="payment.reference">
                    <dt class="opacity-70">{{ t('payments-list-page.filter-reference') }}</dt>
                    <dd>{{ payment.reference }}</dd>
                </template>
                <template v-if="payment.receivedAt">
                    <dt class="opacity-70">{{ t('payments-list-page.label-received') }}</dt>
                    <dd>{{ formatDateTime(payment.receivedAt) }}</dd>
                </template>
                <dt class="opacity-70">{{ t('payments-list-page.column-date') }}</dt>
                <dd>{{ formatDateTime(payment.createdAt) }}</dd>
                <dt class="opacity-70">{{ t('payments-list-page.column-refunded') }}</dt>
                <dd>{{ formatCurrency(payment.amountRefunded, payment.currency) }}</dd>
            </dl>

            <h3 class="mb-2 text-base font-semibold">
                {{ t('payments-list-page.drawer-refunds') }}
            </h3>
            <p
                v-if="payment.refunds.length === 0"
                class="mb-4 text-sm opacity-75"
                data-test="drawer-no-refunds"
            >
                {{ t('payments-list-page.drawer-no-refunds') }}
            </p>
            <ul v-else class="mb-4 space-y-2" data-test="drawer-refunds">
                <li
                    v-for="refund in payment.refunds"
                    :key="refund.id"
                    class="rounded border p-2 text-sm"
                >
                    <div class="flex flex-wrap items-center gap-2">
                        <strong>{{ formatCurrency(refund.amount, refund.currency) }}</strong>
                        <span>{{ t(`payments-list-page.refund-status-${refund.status}`) }}</span>
                        <span class="opacity-70">{{
                            t(`payments-list-page.refund-reason-${refund.reason}`)
                        }}</span>
                    </div>
                    <p v-if="refund.failureReason" class="mt-1" data-test="drawer-failure-reason">
                        {{ t(`payments-list-page.failure-reason-${refund.failureReason}`) }}
                    </p>
                    <p v-if="refund.providerRefundRef" class="mt-1 text-xs">
                        <code>{{ refund.providerRefundRef }}</code>
                    </p>
                    <p class="mt-1 text-xs opacity-70">
                        {{ formatDateTime(refund.settledAt ?? refund.createdAt) }}
                    </p>
                </li>
            </ul>

            <InlineErrorAlert :message="refundError" class="mb-3" data-test="drawer-refund-error" />

            <div class="flex flex-wrap gap-2">
                <v-btn
                    v-if="payment.actions?.refund"
                    color="error"
                    variant="tonal"
                    :disabled="refunding"
                    data-test="drawer-refund"
                    @click="handleRefund"
                >
                    {{ t('payments-list-page.button-refund') }}
                </v-btn>
                <v-btn
                    v-if="orderEditLink"
                    :to="orderEditLink"
                    variant="tonal"
                    data-test="drawer-open-order"
                >
                    {{ t('payments-list-page.button-open-order') }}
                </v-btn>
            </div>
        </div>
    </v-navigation-drawer>
</template>
