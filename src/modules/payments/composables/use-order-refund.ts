/**
 * @module
 * Composable wrapping the payments store's refund flow for a single order, reactive to an
 * order id ref.
 */
import { computed, watch, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { translate as t } from '@/i18n';
import type { EToastType } from '@guebbit/vue-toolkit';
import { usePaymentsStore } from '../store';
import { refundNotice } from './refund-notice';

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
 * separately deployed client. The same holds for the refunds an operator may mark as returned:
 * `actions.settleByHand` names them.
 *
 * @param orderId - The order whose money is in question, reactive so a route change re-reads it.
 * @returns Whether a refund is open, the call that performs one, and the hand-paid refunds
 *  waiting for the operator to confirm the money went back.
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
        canRefund: computed(() => payment.value?.actions.refund === true),
        /**
         * The refunds the caller may mark as returned (hand-paid money opened but not yet
         * confirmed), each with its amount for the confirmation. Empty when there is none.
         */
        settleable: computed(() => {
            const ids = payment.value?.actions.settleByHand ?? [];
            return (payment.value?.refunds ?? []).filter((refund) => ids.includes(refund.id));
        }),
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
         *  which is what withdraws `canRefund`, with what the operator should be told: the money
         *  is back, on file, or the provider refused it (and what to do then).
         */
        refund: (amount?: number): Promise<{ text: string; type: EToastType } | undefined> =>
            payment.value
                ? paymentsStore
                      .refundPayment(payment.value, amount)
                      .then((done) =>
                          done
                              ? refundNotice(
                                    t,
                                    done.refund,
                                    done.payment.actions.settleByHand,
                                    'order-edit-page.refund-done'
                                )
                              : undefined
                      )
                : Promise.resolve(undefined),
        /**
         * What a cancel's refund has become, read off the payment after it was re-read: the
         * refund runs after the cancel's answer, so the page says what is known, not what is hoped.
         *
         * @param doneKey - The wording for a payment that is already refunded.
         */
        cancelNotice: (doneKey: string): string => {
            if (payment.value?.displayStatus === 'refunded') return t(doneKey);
            return t(
                (payment.value?.actions.settleByHand.length ?? 0) > 0
                    ? 'refund-notice.recorded'
                    : 'refund-notice.cancel-under-way'
            );
        },
        /**
         * Confirms that one hand-paid refund's money was returned outside the application.
         *
         * @param refundId - A record from `settleable`.
         * @returns A promise resolving once the answered payment has replaced the cached one,
         *  which is what removes the record from `settleable`.
         */
        settle: (refundId: string) =>
            payment.value
                ? paymentsStore.settleRefundByHand(payment.value, refundId).then(() => undefined)
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
