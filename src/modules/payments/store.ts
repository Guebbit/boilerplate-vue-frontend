/**
 * @module
 * Pinia store for the payments module. Wraps useStructureRestApi's fetchAny for loading state
 * and mirrors the API's payment record locally, keeping the PSP intent/confirm sequence and the
 * "404 means no payment yet" rule in one place.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { queryClient } from '@/infrastructure/query-client.ts';
import {
    createPaymentIntent,
    confirmPayment,
    syncPayment,
    getPaymentByOrder,
    getOrderByReference,
    refundPaymentByOrder,
    recordOfflinePayment as recordOfflinePaymentRequest,
    listPaymentMethods
} from '@api';
import type { Order, Payment, PaymentMethodOption, RecordOfflinePaymentRequest } from '@types';
import { rethrowUnlessAbsent } from '@/infrastructure/utils/errors';
import { useIdempotencyKey } from '@/infrastructure/http/idempotency.ts';

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
    /**
     * The toolkit's REST slice for this store: the loading flag and the `fetchAny` wrapper
     * every action below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<Payment, string>({
        resourceKey: 'payments',
        queryClient
    });

    /**
     * The current order's payment, or undefined while none exists (no intent yet, or a guest).
     */
    const payment = ref<Payment | undefined>();

    /**
     * `Idempotency-Key` for the intent/confirm pair `payForOrder` sends (B10) — the contract
     * declares the header on both `POST /payments/intent` and `POST /payments/{id}/confirm`, so
     * both keys settle together: a retry after a network error or a 5xx at EITHER step resends
     * both unchanged, and any other outcome (success, or a decline the visitor answers with a
     * different method) mints a fresh pair for whatever `payForOrder` is called with next.
     */
    const intentIdempotencyKey = useIdempotencyKey();

    /**
     * `Idempotency-Key` for `confirmPayment`, settled alongside {@link intentIdempotencyKey}.
     */
    const confirmIdempotencyKey = useIdempotencyKey();

    /**
     * `Idempotency-Key` for `refundForOrder`'s `POST /payments/order/{orderId}/refund`.
     */
    const refundIdempotencyKey = useIdempotencyKey();

    /**
     * `Idempotency-Key` for `recordOfflinePayment`'s `POST /payments/order/{orderId}/offline`.
     */
    const offlineIdempotencyKey = useIdempotencyKey();

    /**
     * The methods this deployment offers — `card` always, `bank_transfer` once the deployment has
     * configured it. Quoted, not authoritative: checkout re-validates the choice server-side.
     */
    const methods = ref<PaymentMethodOption[]>([]);

    /**
     * Loads the payment methods this deployment offers.
     *
     * @returns A promise resolving with the methods.
     */
    const fetchMethods = () =>
        fetchAny(() =>
            listPaymentMethods().then((response) => {
                methods.value = response.data.methods;
                return methods.value;
            })
        );

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
     * @param confirmOptions - Per-call axios overrides for the CONFIRM step only, forwarded to
     *   `orvalMutator` — `PaymentPanel.vue` attaches a solved `HumanCheck` token through it on the
     *   retry after an `ANTIBOT_VERIFICATION_FAILED` refusal (rung 3 only engages once this
     *   account already has a prior decline). Never applied to the intent step, which the gate
     *   does not guard.
     * @returns A promise resolving with the payment as it now stands.
     */
    const payForOrder = (
        orderId: string,
        paymentMethodRef: string,
        confirmOptions?: AxiosRequestConfig
    ) =>
        fetchAny(() =>
            createPaymentIntent({ orderId }, intentIdempotencyKey.withKey())
                .then((intentResponse) =>
                    confirmPayment(
                        intentResponse.data.id,
                        { paymentMethodRef },
                        confirmIdempotencyKey.withKey(confirmOptions)
                    )
                )
                .then((response) => {
                    intentIdempotencyKey.settle();
                    confirmIdempotencyKey.settle();
                    payment.value = response.data;
                    return payment.value;
                })
                .catch((error: unknown) => {
                    intentIdempotencyKey.settle(error);
                    confirmIdempotencyKey.settle(error);
                    throw error;
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
            refundPaymentByOrder(orderId, refundIdempotencyKey.withKey())
                .then((response) => {
                    refundIdempotencyKey.settle();
                    payment.value = response.data;
                    return payment.value;
                })
                .catch((error: unknown) => {
                    refundIdempotencyKey.settle(error);
                    throw error;
                })
        );

    /**
     * Records money that arrived outside the provider — cash, a transfer, by hand. Admin-only at
     * the API; a caller without the role gets the 403 this rethrows.
     *
     * The order itself moves `pending → paid` server-side, which this call does not answer for —
     * unlike `payForOrder`, whose caller reloads the order once the LOCAL payment says `succeeded`,
     * this one has no in-flight state to wait out, so the caller reloads the order right away.
     *
     * @param orderId - The order the money arrived for.
     * @param body - The method, an optional reference, and when the money actually arrived.
     * @returns A promise resolving with the payment as it now stands.
     */
    const recordOfflinePayment = (orderId: string, body: RecordOfflinePaymentRequest) =>
        fetchAny(() =>
            recordOfflinePaymentRequest(orderId, body, offlineIdempotencyKey.withKey())
                .then((response) => {
                    offlineIdempotencyKey.settle();
                    payment.value = response.data;
                    return payment.value;
                })
                .catch((error: unknown) => {
                    offlineIdempotencyKey.settle(error);
                    throw error;
                })
        );

    /**
     * Finds the order behind an RF creditor reference — the admin's own step before recording an
     * offline payment, when a bank statement line is all they have. Admin-only at the API, and
     * step-up gated the same way {@link refundForOrder} is.
     *
     * A 404 is an answer, not a failure: the API cannot tell a malformed reference from one that
     * matches no order, so both mean "no such order" and resolve `undefined`. Every other status
     * still rejects.
     *
     * @param ref - The RF reference, as typed — the API tolerates spaces and case.
     * @returns A promise resolving with the order this reference pays, or `undefined` when none does.
     */
    const findOrderByReference = (ref: string): Promise<Order | undefined> =>
        fetchAny(() =>
            getOrderByReference({ ref })
                .then((response) => response.data)
                .catch((error: unknown) => {
                    // 404 only: a wrong reference is a search result, not an incident to report.
                    rethrowUnlessAbsent(error, 404);
                    return undefined;
                })
        );

    return {
        loading,
        payment,
        methods,
        fetchMethods,
        fetchPaymentForOrder,
        payForOrder,
        finishAtProvider,
        refundForOrder,
        recordOfflinePayment,
        findOrderByReference
    };
});
