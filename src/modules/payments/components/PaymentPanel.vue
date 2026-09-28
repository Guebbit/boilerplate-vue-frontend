<script lang="ts">
export default {
    name: 'PaymentPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Order-page panel component: renders the payment form or the payment's fate, delegating the
 * intent/confirm/sync sequence to the payments store.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { formatCurrency, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import HumanCheck from '@/ui/organisms/HumanCheck.vue';
import { withAntibotToken, isAntibotVerificationFailed } from '@/infrastructure/http/antibot.ts';
import { usePaymentsStore } from '../store.ts';
import { classifyPaymentError } from '@/modules/payments/domain';
import type { UnavailableOrderLine } from '@/modules/payments/domain';
import { OrderStatus } from '@types';

/**
 * The order page's payment corner: a method picker while the order is payable, the payment's fate
 * afterwards, and — between the two — the state a real bank challenge puts a customer in.
 *
 * **There is no card field, and that is the point.** A live provider tokenises the card inside an
 * iframe it owns and hands the browser an opaque reference; a card number reaching this
 * application, let alone its API, is the difference between the light PCI bracket and the heavy
 * one. The picker below stands exactly where that widget mounts, and produces the same kind of
 * value it would.
 */
const { orderId, orderPayable, orderStatus, payBy } = defineProps<{
    /**
     * The order this panel pays.
     */
    orderId: string;
    /**
     * The order's own `actions.pay` — whether it is still awaiting payment.
     */
    orderPayable?: boolean;
    /**
     * The order's current status — decides whether a hand-paid `succeeded` payment shows as
     * "refund pending" (B1b): cancelling never moves it to `refunded` on its own any more, only an
     * operator's own confirmation does.
     */
    orderStatus?: string;
    /**
     * When the hold behind this order ends (FA32c) — every order that holds stock gets one now,
     * card included, not only bank transfer's own `transferInstructions`. Shown here, generically,
     * wherever {@link payable} is true; `TransferInstructionsPanel` still adds its own transfer-
     * specific wording alongside it.
     */
    payBy?: string;
}>();

/**
 * Emitted when the payment settles, so the owning page can reload the order.
 */
const emit = defineEmits<
    /**
     * The money landed and the order's status moved — the parent should re-read it.
     */
    (event: 'paid') => void
>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The payments store, held whole: its actions and its `storeToRefs` slice are both read.
 */
const paymentsStore = usePaymentsStore();

/**
 * The order's payment, as the store last fetched it for ANY order, and whether a call is in
 * flight. `payment` below is the guarded read.
 */
const { payment: rawPayment, loading } = storeToRefs(paymentsStore);

/**
 * This panel's own payment, discarding a stale or mismatched record. The store's `payment` is one
 * shared ref: this page component reuses the same panel instance across orders (no remount on a
 * route param change alone, per `Order.vue`'s `watchOrder`), and a slow response for the PREVIOUS
 * order landing after `orderId` has already moved on must not render as this order's chip (FA24).
 */
const payment = computed(() =>
    rawPayment.value?.orderId === orderId ? rawPayment.value : undefined
);

/**
 * The method references the demo's fake provider recognises — this panel's stand-in for a real
 * provider's widget, which would hand back one opaque reference of its own instead of a choice.
 * Labelled by what each one demonstrates, so the interesting paths are reachable by clicking
 * rather than by knowing a magic number.
 */
const methods = [
    'pm_card_visa',
    'pm_card_declined',
    'pm_card_authentication_required',
    'pm_card_processing'
] as const;

/**
 * The chosen method reference, defaulting to the one that simply pays.
 */
const paymentMethodRef = ref<string>(methods[0]);

/**
 * The form shows only while paying is possible, and both halves of that are the server's answer.
 *
 * Once a payment record exists its own `actions.pay` decides, because the API already folded the
 * order's status into it — which is what flips the panel the instant money lands, before the
 * parent's re-read of the order comes back. Before any intent exists there is no payment to ask,
 * so the order's `actions.pay` stands in.
 */
const payable = computed(() =>
    payment.value ? payment.value.actions?.pay === true : orderPayable
);

/**
 * Whether the payment is somewhere between submitted and settled — the bank is asking for a
 * challenge, or the provider has not finished. Neither is a failure, and neither is done: the
 * panel offers the next step rather than the form again.
 */
const inFlight = computed(
    () => payment.value?.status === 'requires_action' || payment.value?.status === 'processing'
);

/**
 * A hand-paid order was cancelled, but nobody has confirmed the money actually went back (B1b):
 * cancelling a `manual` payment now only leaves it `succeeded` and waits for an operator's own
 * refund — it no longer moves to `refunded` by itself, so the panel must say why a "paid" order is
 * also a cancelled one.
 */
const refundPending = computed(
    () =>
        payment.value?.status === 'succeeded' &&
        payment.value.method !== 'card' &&
        orderStatus === OrderStatus.cancelled
);

/**
 * Announces a settled payment and tells the parent to re-read the order — the one thing both the
 * confirm and the sync do when the money finally lands.
 */
const announceIfSettled = () => {
    if (payment.value?.status !== 'succeeded') return;
    addMessage(t('payments-panel.success'));
    emit('paid');
};

/**
 * The lines an `ORDER_PRODUCT_UNAVAILABLE` refusal named — a product removed or deactivated
 * since the order was placed, caught fresh at payment start rather than trusting the order's own
 * frozen snapshot. Empty whenever the last attempt did not end in this refusal.
 */
const unavailableLines = ref<UnavailableOrderLine[]>([]);

/**
 * This panel's own blocked state — paying and finishing at the provider are two steps of the same
 * one workflow, never shown at once, so both share the one instance rendered next to whichever
 * step is current. `ORDER_PRODUCT_UNAVAILABLE` stays its own toast/list above, since it already has
 * a more specific answer than a generic blocking message.
 */
const {
    message: paymentError,
    report: reportPaymentError,
    clear: clearPaymentError
} = useBlockingError();

/**
 * The human-challenge widget, shown only once rung 3 has actually engaged — `paymentDeclineChallengeGate`
 * only mounts `humanChallengeGate` once this account already has a prior decline on this order,
 * never on a first attempt. Read for its solved token on the retry below.
 */
const humanCheck = ref<InstanceType<typeof HumanCheck>>();

/**
 * Whether the last confirm was refused for a missing/invalid challenge token — the signal to show
 * {@link humanCheck} inline instead of the generic blocked-panel message.
 */
const requiresHumanCheck = ref(false);

/**
 * Pays the order with the chosen method, notifies the result, and tells the parent to re-read the
 * order once it actually settles. A decline rejects; an in-flight answer does not, and leaves the
 * panel showing the next step. An `ANTIBOT_VERIFICATION_FAILED` refusal instead reveals
 * {@link humanCheck}, so the visitor solves it and presses "pay" again with the same method.
 */
const submitPayment = () => {
    unavailableLines.value = [];
    clearPaymentError();
    return paymentsStore
        .payForOrder(orderId, paymentMethodRef.value, withAntibotToken(humanCheck.value?.token))
        .then(() => {
            requiresHumanCheck.value = false;
            announceIfSettled();
        })
        .catch((error: unknown) => {
            if (isAntibotVerificationFailed(error)) {
                requiresHumanCheck.value = true;
                reportPaymentError(error);
                return;
            }
            const verdict = classifyPaymentError(error);
            if (verdict.kind === 'product-unavailable') {
                unavailableLines.value = verdict.lines;
                addMessage(t('payments-panel.error-product-unavailable'));
                return;
            }
            reportPaymentError(error);
        });
};

/**
 * Reports back that the browser has finished at the provider — a challenge answered, or simply a
 * re-check of something still processing. With a live provider the challenge itself runs in the
 * provider's own frame first; here there is nothing to answer, so the button IS the challenge.
 */
const finishAtProvider = () => {
    if (!payment.value) return Promise.resolve();
    clearPaymentError();
    return paymentsStore
        .finishAtProvider(payment.value.id)
        .then(announceIfSettled)
        .catch((error: unknown) => reportPaymentError(error));
};

/**
 * Fetches the payment on mount AND whenever `orderId` changes — `immediate: true` covers the
 * mount case, the watch covers navigating to a different order without a remount (FA24).
 */
watch(
    () => orderId,
    (newOrderId) => void paymentsStore.fetchPaymentForOrder(newOrderId),
    { immediate: true }
);
</script>

<template>
    <v-card class="p-4" data-test="payment-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('payments-panel.title') }}</h3>

        <!--
            FA32c: shown wherever the order is still payable, not only bank transfer's own
            TransferInstructionsPanel — a card order holds stock exactly the same way.
        -->
        <p v-if="payable && payBy" class="mb-3 text-sm opacity-75" data-test="payment-deadline">
            {{ t('payments-panel.label-deadline', { payBy: formatDateTime(payBy) }) }}
        </p>

        <InlineErrorAlert :message="paymentError" class="mb-3" test-id="payment-panel-error" />

        <!--
            The picker's hint is the field's own `hint`, so it is wired as the field's description
            rather than sitting beside it as a paragraph a reader never connects to the input.
        -->
        <form v-if="payable" novalidate @submit.prevent="submitPayment">
            <!--
                ORDER_PRODUCT_UNAVAILABLE names every line whose product left the catalogue since
                the order was placed — the same one-pass-fix reasoning as the cart's own
                CART_PRODUCT_UNAVAILABLE alert, not a generic toast.
            -->
            <v-alert
                v-if="unavailableLines.length > 0"
                type="warning"
                variant="tonal"
                class="mb-3"
                data-test="payment-unavailable"
            >
                <ul class="flex flex-col gap-1">
                    <li
                        v-for="line in unavailableLines"
                        :key="line.productId"
                        data-test="payment-unavailable-line"
                    >
                        {{ line.title }}
                    </li>
                </ul>
            </v-alert>
            <v-select
                v-model="paymentMethodRef"
                :items="
                    methods.map((value) => ({ value, title: t(`payments-panel.method-${value}`) }))
                "
                :label="t('payments-panel.label-method')"
                :hint="t('payments-panel.hint-method')"
                persistent-hint
                data-test="payment-method-select"
                :disabled="loading"
                class="mb-3"
            />
            <HumanCheck v-if="requiresHumanCheck" ref="humanCheck" class="mb-3" />
            <v-btn type="submit" color="primary" data-test="payment-submit" :disabled="loading">
                {{ t('payments-panel.button-pay') }}
            </v-btn>
        </form>

        <template v-else-if="inFlight && payment">
            <div class="mb-3 flex items-center gap-3" data-test="payment-status">
                <v-chip color="info" size="small">
                    {{ t(`payments-panel.status-${payment.status}`) }}
                </v-chip>
                <span class="text-sm">
                    {{ formatCurrency(payment.amount, payment.currency) }}
                </span>
            </div>
            <p class="mb-3 text-sm opacity-75">
                {{ t(`payments-panel.explain-${payment.status}`) }}
            </p>
            <v-btn
                color="primary"
                data-test="payment-finish"
                :disabled="loading"
                @click="finishAtProvider"
            >
                {{ t('payments-panel.button-finish') }}
            </v-btn>
        </template>

        <template v-else-if="payment">
            <div class="flex items-center gap-3" data-test="payment-status">
                <v-chip
                    :color="payment.status === 'refunded' || refundPending ? 'warning' : 'success'"
                    size="small"
                >
                    {{ t(`payments-panel.status-${payment.status}`) }}
                </v-chip>
                <span v-if="payment.cardLast4" class="text-sm opacity-75">
                    {{ t('payments-panel.label-card-ending', { last4: payment.cardLast4 }) }}
                </span>
                <span class="text-sm">
                    {{ formatCurrency(payment.amount, payment.currency) }}
                </span>
            </div>
            <!--
                Offline-only fields: `method` is `card` for anything the provider handled, so this
                only says something new when an admin recorded the money by hand.
            -->
            <p
                v-if="payment.method !== 'card'"
                class="mt-2 mb-0 text-sm opacity-75"
                data-test="payment-offline-detail"
            >
                {{ t(`payments-panel.method-offline-${payment.method}`) }}
                <template v-if="payment.reference">
                    — {{ t('payments-panel.label-reference', { reference: payment.reference }) }}
                </template>
            </p>
            <p
                v-if="payment.refundedByHand"
                class="mt-2 mb-0 text-sm"
                data-test="payment-refunded-by-hand"
            >
                {{ t('payments-panel.refunded-by-hand') }}
            </p>
            <p
                v-else-if="refundPending"
                class="mt-2 mb-0 text-sm"
                data-test="payment-refund-pending"
            >
                {{ t('payments-panel.refund-pending') }}
            </p>
        </template>

        <p v-else class="m-0 text-sm opacity-75">{{ t('payments-panel.none') }}</p>
    </v-card>
</template>
