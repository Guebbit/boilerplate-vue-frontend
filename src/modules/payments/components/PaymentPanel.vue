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
import { notifyErrorMessages } from '@/infrastructure/errors.ts';
import { usePaymentsStore } from '../store.ts';

/**
 * The order page's payment corner: a card form while the order is payable, the payment's fate
 * afterwards. The two-step intent/confirm shape lives in the store; this component only knows
 * that submitting a card either pays the order or explains itself.
 *
 * The card field is prefilled with the conventional success number — this is a demo, and the
 * decline is deliberately one documented number away (the hint below the field says which).
 */
const { orderId, orderStatus } = defineProps<{
    /** The order this panel pays. */
    orderId: string;
    /** Its current status — the form only shows while `pending`. */
    orderStatus?: string;
}>();

const emit = defineEmits<{
    /** The charge landed and the order's status moved — the parent should re-read it. */
    (event: 'paid'): void;
}>();

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const paymentsStore = usePaymentsStore();
const { payment, loading } = storeToRefs(paymentsStore);

const cardNumber = ref('4242 4242 4242 4242');

/**
 * The form shows only while paying is possible; afterwards the record speaks. The payment's own
 * status participates so the panel flips the instant the charge lands, even while the parent's
 * re-read of the order is still in flight.
 */
const payable = computed(() => orderStatus === 'pending' && payment.value?.status !== 'succeeded');

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

        <template v-if="payable">
            <v-text-field
                v-model="cardNumber"
                :label="t('payments-panel.label-card')"
                data-test="payment-card-input"
                :disabled="loading"
            />
            <p class="m-0 mb-3 text-xs opacity-75">{{ t('payments-panel.hint-decline') }}</p>
            <v-btn
                color="primary"
                data-test="payment-submit"
                :disabled="loading"
                @click="submitPayment"
            >
                {{ t('payments-panel.button-pay') }}
            </v-btn>
        </template>

        <template v-else-if="payment">
            <div class="flex items-center gap-3" data-test="payment-status">
                <v-chip :color="payment.status === 'refunded' ? 'warning' : 'success'" size="small">
                    {{ t(`payments-panel.status-${payment.status}`) }}
                </v-chip>
                <span v-if="payment.cardLast4" class="text-sm opacity-75">
                    {{ t('payments-panel.label-card-ending', { last4: payment.cardLast4 }) }}
                </span>
                <span class="text-sm">{{ payment.amount }} {{ payment.currency }}</span>
            </div>
        </template>

        <p v-else class="m-0 text-sm opacity-75">{{ t('payments-panel.none') }}</p>
    </v-card>
</template>
