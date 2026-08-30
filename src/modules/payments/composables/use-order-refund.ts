/**
 * @module
 * Composable wrapping the payments store's refund flow for a single order, reactive to an
 * order id ref.
 */
import { computed, watch, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentsStore } from '../store';

/**
 * The operator's refund control for one order — published where the store is not.
 *
 * The barrel keeps `usePaymentsStore` inside on purpose: a sibling reaching it would be building a
 * second pay flow beside the panel's. This is the narrow exception, and it is narrow by shape
 * rather than by promise — it answers one question and performs one action, so no caller can grow
 * a payment flow out of it.
 *
 * Whether a refund is possible is never decided here. `actions.refund` is the server's answer, and
 * it is what greys the control out; re-deriving it from a status would put half the rule in a
 * separately deployed client.
 *
 * @param orderId - The order whose money is in question, reactive so a route change re-reads it.
 * @returns Whether a refund is open, and the call that performs one.
 */
export const useOrderRefund = (orderId: Ref<string | undefined>) => {
    const paymentsStore = usePaymentsStore();
    const { payment } = storeToRefs(paymentsStore);

    watch(
        orderId,
        (id) => {
            if (id) void paymentsStore.fetchPaymentForOrder(id);
        },
        { immediate: true }
    );

    return {
        /**
         * Whether `refund()` would be accepted — false once the money is already back.
         */
        canRefund: computed(() => payment.value?.actions?.refund === true),
        /**
         * Returns the money without touching the order's status.
         *
         * @returns A promise resolving once the refreshed payment has replaced the cached one,
         *  which is what withdraws `canRefund`.
         */
        refund: () =>
            orderId.value
                ? paymentsStore.refundForOrder(orderId.value).then(() => undefined)
                : Promise.resolve()
    };
};
