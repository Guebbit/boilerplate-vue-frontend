import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { createPaymentIntent, confirmPayment, getPaymentByOrder, refundPaymentByOrder } from '@api';
import type { Payment } from '@types';
import { absentIs } from '@/infrastructure/utils/errors';

/**
 * The payment behind an order — one record, mirrored from whatever the API last said.
 *
 * The two-step PSP shape is kept visible on purpose: `payForOrder` creates (or refreshes) the
 * intent and then confirms it with the card, exactly the sequence a real provider integration
 * makes, so swapping the fake for a live one changes the transport and none of this store.
 */
export const usePaymentsStore = defineStore('payments', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<Payment, string>({
        getLoading,
        setLoading
    });

    /** The current order's payment, or undefined while none exists (no intent yet, or a guest). */
    const payment = ref<Payment | undefined>();

    /**
     * Loads the payment behind an order. A 404 is an answer — no intent yet — not an error:
     * the panel renders the pay form from `undefined`.
     *
     * @param orderId - The order in question.
     * @returns A promise resolving with the payment, or undefined.
     */
    const fetchPaymentForOrder = (orderId: string) =>
        fetchAny(() =>
            getPaymentByOrder(orderId)
                .then((response) => {
                    payment.value = response.data;
                    return payment.value;
                })
                .catch((error: unknown) => {
                    // 404 only: anything else is a real failure, and swallowing it would render
                    // the pay form for an order that already has a payment.
                    if (!absentIs(error, 404)) throw error;
                    payment.value = undefined;
                    return undefined;
                })
        );

    /**
     * Pays an order: intent first, then the confirm with the card. The record the API answers
     * (succeeded — a decline rejects) replaces the local one; the caller reloads the ORDER,
     * whose status just moved.
     *
     * @param orderId - The order to pay.
     * @param cardNumber - What the customer typed.
     * @returns A promise resolving with the confirmed payment.
     */
    const payForOrder = (orderId: string, cardNumber: string) =>
        fetchAny(() =>
            createPaymentIntent({ orderId })
                .then((intentResponse) => confirmPayment(intentResponse.data.id, { cardNumber }))
                .then((response) => {
                    payment.value = response.data;
                    return payment.value;
                })
        );

    /**
     * Returns an order's money without touching its status — the operator's standalone refund.
     * Admin-only at the API; a caller without the role gets the 403 this rethrows.
     *
     * The refreshed payment replaces the cached one, which is what withdraws `actions.refund` and
     * greys the control out afterwards.
     *
     * @param orderId - The order whose payment is being returned.
     * @returns A promise resolving with the refunded payment.
     */
    const refundForOrder = (orderId: string) =>
        fetchAny(() =>
            refundPaymentByOrder(orderId).then((response) => {
                payment.value = response.data;
                return payment.value;
            })
        );

    return {
        loading,
        payment,
        fetchPaymentForOrder,
        payForOrder,
        refundForOrder
    };
});
