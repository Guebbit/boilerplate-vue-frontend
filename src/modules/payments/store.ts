/**
 * @module
 * Pinia store for the payments module. Wraps useStructureRestApi's fetchAny for loading state
 * and mirrors the API's payment record locally, keeping the PSP intent/confirm sequence and the
 * "404 means no payment yet" rule in one place.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    createPaymentIntent,
    confirmPayment,
    syncPayment,
    getPaymentByOrder,
    refundPaymentByOrder
} from '@api';
import type { Payment } from '@types';
import { rethrowUnlessAbsent } from '@/infrastructure/utils/errors';

/**
 * The payment behind an order — one record, mirrored from whatever the API last said.
 *
 * The PSP sequence is kept visible on purpose, because it is the sequence every real provider
 * imposes: create the intent, hand the provider's own widget a method reference, confirm — and
 * then, if the bank wants a challenge, finish it in the browser and ask the API to re-read the
 * provider. `payForOrder` never sees a card number; a provider widget tokenises the card in an
 * iframe it owns, and this store only ever handles the opaque handle that comes back.
 */
export const usePaymentsStore = defineStore('payments', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<Payment, string>({
        loadingKey: 'payments',
        getLoading,
        setLoading
    });

    /**
     * The current order's payment, or undefined while none exists (no intent yet, or a guest).
     */
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
                    rethrowUnlessAbsent(error, 404);
                    payment.value = undefined;
                    return undefined;
                })
        );

    /**
     * Pays an order: intent first, then the confirm with the provider's method reference.
     *
     * The answer is NOT always final — `requires_action` means the bank wants a challenge and
     * `processing` that the provider is still settling, and both come back as successes. Only a
     * decline rejects. The record the API answers replaces the local one, and the caller reloads
     * the ORDER only once the payment actually says `succeeded`.
     *
     * @param orderId - The order to pay.
     * @param paymentMethodRef - The provider's opaque handle for the method, from its own widget.
     *   Never a card number: with a live provider the card is tokenised inside the provider's
     *   iframe and this application never sees it.
     * @returns A promise resolving with the payment as it now stands.
     */
    const payForOrder = (orderId: string, paymentMethodRef: string) =>
        fetchAny(() =>
            createPaymentIntent({ orderId })
                .then((intentResponse) =>
                    confirmPayment(intentResponse.data.id, { paymentMethodRef })
                )
                .then((response) => {
                    payment.value = response.data;
                    return payment.value;
                })
        );

    /**
     * Tells the API the browser has finished at the provider, so it re-reads the provider's own
     * record and settles. The step after a `requires_action` challenge, and the way out of
     * `processing` without waiting for the provider's webhook to arrive.
     *
     * Idempotent at the API, so a caller may retry it freely.
     *
     * @param paymentId - The payment to re-read.
     * @returns A promise resolving with the payment as the provider now reports it.
     */
    const finishAtProvider = (paymentId: string) =>
        fetchAny(() =>
            syncPayment(paymentId).then((response) => {
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
        finishAtProvider,
        refundForOrder
    };
});
