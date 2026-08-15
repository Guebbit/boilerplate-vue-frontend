import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { createPaymentIntent, confirmPayment, getPaymentByOrder } from '@api';
import type { Payment } from '@types';

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
                .catch(() => {
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
                .then((intentResponse) =>
                    confirmPayment(String(intentResponse.data?.id), { cardNumber })
                )
                .then((response) => {
                    payment.value = response.data;
                    return payment.value;
                })
        );

    return {
        loading,
        payment,
        fetchPaymentForOrder,
        payForOrder
    };
});
