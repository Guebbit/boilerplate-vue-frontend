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
    /**
     * The payments store, held whole: its actions and its `storeToRefs` slice are both read.
     */
    const paymentsStore = usePaymentsStore();

    /**
     * The order's payment, whose status decides what this composable will allow, and the
     * payments store's own in-flight flag — a different loading key from the orders store's, so
     * a caller gating its refund BUTTON on the orders store's `loading` alone never actually
     * blocks a double click while `refund()` itself is still out.
     */
    const { payment, loading: refundLoading } = storeToRefs(paymentsStore);

    // Vue `watch(source, callback, { immediate })`: `immediate` fetches the payment for an order id
    // that is already set when the composable is created.
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
         * Whether a refund (or any other payments-store call for this order) is already in
         * flight — the flag a "Refund only" button must also disable on, since `refund()` runs
         * under the payments store, not the caller's own orders-store `loading`.
         */
        refundLoading,
        /**
         * Returns the money without touching the order's status.
         *
         * @param amount - A partial refund; absent returns everything still refundable.
         * @returns A promise resolving once the refreshed payment has replaced the cached one,
         *  which is what withdraws `canRefund`.
         */
        refund: (amount?: number) =>
            orderId.value
                ? paymentsStore.refundForOrder(orderId.value, amount).then(() => undefined)
                : Promise.resolve(),
        /**
         * Re-reads the payment against the current order id, forced past the cache.
         *
         * For a caller that just moved the ORDER (a cancel), not the payment, so `canRefund`
         * reflects the fresh state instead of whatever the mount-time fetch last saw.
         *
         * @returns A promise resolving once the refreshed payment has replaced the cached one.
         */
        refreshPayment: () =>
            orderId.value
                ? paymentsStore.fetchPaymentForOrder(orderId.value).then(() => undefined)
                : Promise.resolve()
    };
};
