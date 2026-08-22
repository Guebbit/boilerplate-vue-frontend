<script lang="ts">
export default {
    name: 'PaymentPanel'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { usePaymentsStore } from '../store.ts';

/**
 * The order page's payment corner: a card form while the order is payable, the payment's fate
 * afterwards. The two-step intent/confirm shape lives in the store; this component only knows
 * that submitting a card either pays the order or explains itself.
 *
 * The card field is prefilled with the conventional success number — this is a demo, and the
 * decline is deliberately one documented number away (the hint below the field says which).
 */
const { orderId, orderPayable } = defineProps<{
    /** The order this panel pays. */
    orderId: string;
    /** The order's own `actions.pay` — whether it is still awaiting payment. */
    orderPayable?: boolean;
}>();

const emit = defineEmits<
    /** The charge landed and the order's status moved — the parent should re-read it. */
    (event: 'paid') => void
>();

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const paymentsStore = usePaymentsStore();
const { payment, loading } = storeToRefs(paymentsStore);

const cardNumber = ref('4242 4242 4242 4242');

/**
 * The form shows only while paying is possible, and both halves of that are the server's answer.
 *
 * Once a payment record exists its own `actions.pay` decides, because the API already folded the
 * order's status into it — which is what flips the panel the instant a charge lands, before the
 * parent's re-read of the order comes back. Before any intent exists there is no payment to ask,
 * so the order's `actions.pay` stands in.
 */
const payable = computed(() =>
    payment.value ? payment.value.actions?.pay === true : orderPayable
);

const submitPayment = () =>
    paymentsStore
        .payForOrder(orderId, cardNumber.value)
        .then(() => {
            addMessage(t('payments-panel.success'));
            emit('paid');
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

onMounted(() => {
    void paymentsStore.fetchPaymentForOrder(orderId);
});
</script>

<template>
    <v-card class="p-4" data-test="payment-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('payments-panel.title') }}</h3>

        <!--
            The decline hint is the field's own `hint`, so it is wired as the field's description
            rather than sitting beside it as a paragraph a reader never connects to the input.
        -->
        <form v-if="payable" novalidate @submit.prevent="submitPayment">
            <v-text-field
                v-model="cardNumber"
                :label="t('payments-panel.label-card')"
                :hint="t('payments-panel.hint-decline')"
                persistent-hint
                autocomplete="cc-number"
                inputmode="numeric"
                data-test="payment-card-input"
                :disabled="loading"
                class="mb-3"
            />
            <v-btn type="submit" color="primary" data-test="payment-submit" :disabled="loading">
                {{ t('payments-panel.button-pay') }}
            </v-btn>
        </form>

        <template v-else-if="payment">
            <div class="flex items-center gap-3" data-test="payment-status">
                <v-chip :color="payment.status === 'refunded' ? 'warning' : 'success'" size="small">
                    {{ t(`payments-panel.status-${payment.status}`) }}
                </v-chip>
                <span v-if="payment.cardLast4" class="text-sm opacity-75">
                    {{ t('payments-panel.label-card-ending', { last4: payment.cardLast4 }) }}
                </span>
                <span class="text-sm">
                    {{ formatCurrency(payment.amount, payment.currency) }}
                </span>
            </div>
        </template>

        <p v-else class="m-0 text-sm opacity-75">{{ t('payments-panel.none') }}</p>
    </v-card>
</template>
