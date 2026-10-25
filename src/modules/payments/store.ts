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
    createPayment,
    confirmPayment,
    syncPayment,
    getPayment,
    getPaymentByOrder,
    createRefund,
    settleRefundByHand as settleRefundByHandRequest,
    recordOfflinePayment as recordOfflinePaymentRequest,
    listPaymentMethods,
    searchPayments,
    listRefunds,
    listPaymentAttention
} from '@api';
import type {
    ListRefundsParams,
    Payment,
    PaymentAttentionItem,
    PaymentMethodOption,
    RecordOfflinePaymentRequest,
    RefundListItem,
    SearchPaymentsRequest
} from '@types';
import { ERROR_CODES } from '@api/error-codes';
import {
    hasErrorCode,
    isTransportFailure,
    rethrowUnlessAbsent
} from '@/infrastructure/utils/errors';
import { useIdempotencyKeys } from '@/infrastructure/http/idempotency.ts';

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
     * `Idempotency-Key`s for `confirmPayment`, one per order — the contract declares the header on
     * `POST /payments/{id}/confirm` only: `POST /payments` takes none (asking again already
     * refreshes the same intent, and a stored replay would keep its `clientSecret`). A retry after
     * a lost connection resends the key unchanged; any answer (success, a decline the visitor
     * answers with a different method, a fault) mints a fresh one.
     */
    const confirmIdempotencyKeys = useIdempotencyKeys();

    /**
     * `Idempotency-Key`s for `refundPayment`'s `POST /payments/{id}/refunds`, one per payment: a
     * key kept for payment A must never ride on a refund of payment B.
     */
    const refundIdempotencyKeys = useIdempotencyKeys();

    /**
     * `Idempotency-Key`s for `recordOfflinePayment`'s `POST /payments/orders/{orderId}/offline`, one
     * per order, for the same reason as the refund's.
     */
    const offlineIdempotencyKeys = useIdempotencyKeys();

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
                methods.value = response.methods;
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
                    payment.value = response;
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
     * After a refusal that says the payment is not as the page shows it, re-reads the order's
     * payment before rethrowing: a server fault (the write may have landed before the 500, and a
     * spent key means a retry is a NEW attempt), or one of `staleCodes` (another operator moved
     * the same payment first). Any other failure is rethrown as it is.
     *
     * @param orderId - The order the failed call was about.
     * @param error - The rejected value, rethrown unchanged.
     * @param staleCodes - Error codes that also mean "re-read", beyond a 5xx.
     * @returns A promise that always rejects with `error`.
     * @throws The original error, once the payment has been re-read.
     */
    const rereadAfterFault = (
        orderId: string,
        error: unknown,
        ...staleCodes: string[]
    ): Promise<never> =>
        (!isTransportFailure(error) &&
        ((error as { status: number }).status >= 500 || hasErrorCode(error, ...staleCodes))
            ? fetchPaymentForOrder(orderId).then(
                  () => undefined,
                  () => undefined
              )
            : Promise.resolve()
        ).then(() => {
            throw error;
        });

    /**
     * Reads an order's payment (`GET /payments/orders/{orderId}`) without touching the shared
     * `payment` record: for a screen that is not the order page (the needs-attention list opening
     * the drawer) and must not replace what an order page holds.
     *
     * @param orderId - The order whose payment is asked about.
     * @returns A promise resolving with the payment as this caller may act on it.
     */
    const readPaymentForOrder = (orderId: string) => fetchAny(() => getPaymentByOrder(orderId));

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
    ) => {
        const confirmKeeper = confirmIdempotencyKeys.forSubject(orderId);
        return fetchAny(() =>
            createPayment({ orderId })
                .then((intentResponse) =>
                    confirmPayment(
                        intentResponse.id,
                        { paymentMethodRef },
                        confirmKeeper.withKey(confirmOptions)
                    )
                )
                .then((response) => {
                    confirmKeeper.settle();
                    payment.value = response;
                    return payment.value;
                })
                .catch((error: unknown) => {
                    confirmKeeper.settle(error);
                    return rereadAfterFault(orderId, error);
                })
        );
    };

    /**
     * Tells the API the browser has finished at the provider, so it re-reads the provider's own
     * record and settles. The step after a `requires_action` challenge, and the way out of
     * `processing` without waiting for the provider's webhook to arrive.
     *
     * Idempotent at the API, so a caller may retry it freely.
     *
     * A decline, or a payment that was never confirmable, re-reads the order's payment before it
     * rejects: the stored one still offers "finish", which is no longer true.
     *
     * @param paymentId - The payment to re-read.
     * @param orderId - Its order, for that re-read.
     * @returns A promise resolving with the payment as the provider now reports it.
     */
    const finishAtProvider = (paymentId: string, orderId: string) =>
        fetchAny(() =>
            syncPayment(paymentId)
                .then((response) => {
                    payment.value = response;
                    return payment.value;
                })
                .catch((error: unknown) =>
                    rereadAfterFault(
                        orderId,
                        error,
                        ERROR_CODES.PAYMENT_DECLINED,
                        ERROR_CODES.PAYMENT_NOT_CONFIRMABLE
                    )
                )
        );

    /**
     * Returns a payment's money without touching its order's status — the operator's standalone
     * refund. Admin-only at the API; a caller without the role gets the 403 this rethrows.
     *
     * The API answers 201 with the record this request wrote, whatever became of it: `succeeded`,
     * `pending` (hand-paid money waiting for the operator) or `failed` (the provider refused). A
     * refusal is an answer, not an error. The payment is read again (`GET /payments/{id}`) and
     * replaces the cached one: that carries the running totals, `actions.settleByHand` (which names
     * the record to confirm) and withdraws `actions.refund`, which greys the control out.
     *
     * @param target - The payment being returned and the order it belongs to.
     * @param target.id - The payment.
     * @param target.orderId - Its order, for the re-read after a fault.
     * @param amount - A partial refund, a decimal in the payment's own currency. Absent returns
     *  everything still refundable.
     * @returns A promise resolving with the refreshed payment and the record this request wrote.
     */
    const refundPayment = (target: { id: string; orderId: string }, amount?: number) => {
        const keeper = refundIdempotencyKeys.forSubject(target.id);
        return fetchAny(() =>
            createRefund(target.id, amount === undefined ? undefined : { amount }, keeper.withKey())
                .then((created) => {
                    keeper.settle();
                    return getPayment(target.id).then((response) => {
                        payment.value = response;
                        return { payment: response, refund: created };
                    });
                })
                .catch((error: unknown) => {
                    keeper.settle(error);
                    // Two operators refunding the same payment: the loser's answer says nothing
                    // is left, and the page still shows the control.
                    return rereadAfterFault(
                        target.orderId,
                        error,
                        ERROR_CODES.PAYMENT_NOT_REFUNDABLE
                    );
                })
        );
    };

    /**
     * Confirms that a refund's money was returned outside the application
     * (`POST /payments/{id}/refunds/{refundId}/settle`). Nothing is sent anywhere. Needs
     * `create:Refund` and a fresh session; the API answers the refund it settled, so the payment is
     * read again for the totals and its `actions`.
     *
     * The re-read replaces the cached payment when it is the same one. A refund another operator
     * settled first answers 409 `PAYMENT_REFUND_NOT_OPEN`, and a card refund that has no final
     * answer yet answers 409 `PAYMENT_REFUND_IN_FLIGHT`; either way the payment is re-read before the
     * error is rethrown, so the "Mark returned" button the loser pressed is gone.
     *
     * @param target - The payment and the order it belongs to.
     * @param target.id - The payment carrying the refund.
     * @param target.orderId - Its order, for the re-read.
     * @param refundId - The refund record to mark as returned.
     * @returns A promise resolving with the payment as it now stands.
     */
    const settleRefundByHand = (target: { id: string; orderId: string }, refundId: string) =>
        fetchAny(() =>
            settleRefundByHandRequest(target.id, refundId)
                // The answer is the refund; the payment (totals, actions) is a read of its own.
                .then(() => getPayment(target.id))
                .then((response) => {
                    if (payment.value?.id === response.id) payment.value = response;
                    return response;
                })
                .catch((error: unknown) =>
                    rereadAfterFault(
                        target.orderId,
                        error,
                        ERROR_CODES.PAYMENT_REFUND_NOT_OPEN,
                        ERROR_CODES.PAYMENT_REFUND_IN_FLIGHT
                    )
                )
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
    const recordOfflinePayment = (orderId: string, body: RecordOfflinePaymentRequest) => {
        const keeper = offlineIdempotencyKeys.forSubject(orderId);
        return fetchAny(() =>
            recordOfflinePaymentRequest(orderId, body, keeper.withKey())
                .then((response) => {
                    keeper.settle();
                    payment.value = response;
                    return payment.value;
                })
                .catch((error: unknown) => {
                    keeper.settle(error);
                    return rereadAfterFault(orderId, error);
                })
        );
    };

    /**
     * Finds the order behind an RF creditor reference — the admin's own step before recording an
     * offline payment, when a bank statement line is all they have. It is the staff list filtered
     * by `transferReference` (`POST /payments/search`), so it needs `display:Payment`.
     *
     * An empty page is an answer, not a failure: the API reads the code in its canonical form and
     * answers nothing for a malformed or unmatched one alike, so both mean "no such order" and
     * resolve `undefined`. Every error still rejects.
     *
     * @param ref - The RF reference, as typed — the API tolerates spaces and case.
     * @returns A promise resolving with the id of the order this reference pays, or `undefined`.
     */
    const findOrderIdByReference = (ref: string): Promise<string | undefined> =>
        fetchAny(() =>
            searchPayments({ transferReference: ref, pageSize: 1 }).then(
                (response) => response.items[0]?.orderId
            )
        );

    /**
     * The staff list's current page of payments, as last fetched — separate from {@link payment},
     * which is the one payment behind the order being looked at.
     */
    const paymentsPage = ref<Payment[]>([]);

    /**
     * How many payments match the last query, across every page.
     */
    const paymentsTotal = ref(0);

    /**
     * The "Awaiting transfer" tab's page: bank transfers still owed, soonest deadline first. Held
     * apart from {@link paymentsPage}, because both tabs of the page stay mounted.
     */
    const awaitingPage = ref<Payment[]>([]);

    /**
     * How many transfers are owed, across every page.
     */
    const awaitingTotal = ref(0);

    /**
     * The refunds list's current page, one row per refund across every payment.
     */
    const refundsPage = ref<RefundListItem[]>([]);

    /**
     * How many refunds match the last query, across every page.
     */
    const refundsTotal = ref(0);

    /**
     * Problems still recorded on a document, oldest first — what "Needs attention" lists.
     */
    const attention = ref<PaymentAttentionItem[]>([]);

    /**
     * Loads a page of the staff payments list (`POST /payments/search`). Needs `display:Payment`.
     *
     * @param query - Page, size, sort and the filters; the body form keeps a long filter set out
     *  of the URL.
     * @returns A promise resolving with the page's payments.
     */
    const fetchPaymentsPage = (query: SearchPaymentsRequest) =>
        fetchAny(() =>
            searchPayments(query).then((response) => {
                paymentsPage.value = response.items;
                paymentsTotal.value = response.meta.totalItems;
                return paymentsPage.value;
            })
        );

    /**
     * Loads a page of the bank transfers still owed (`POST /payments/search`: `bank_transfer`,
     * `incomplete`), by nearest `payBy`. Needs `display:Payment`. The body form, because the GET
     * form spells `sort` as a comma list and the HTTP client would send `sort[]=payBy`, which the
     * API refuses as an unknown field.
     *
     * @param page - 1-based page.
     * @param pageSize - Rows per page.
     * @returns A promise resolving with the page's payments.
     */
    const fetchAwaitingPage = (page: number, pageSize: number) =>
        fetchAny(() =>
            searchPayments({
                page,
                pageSize,
                method: 'bank_transfer',
                displayStatus: 'incomplete',
                sort: ['payBy']
            }).then((response) => {
                awaitingPage.value = response.items;
                awaitingTotal.value = response.meta.totalItems;
                return awaitingPage.value;
            })
        );

    /**
     * Loads a page of refunds (`GET /payments/refunds`), newest first. Needs `display:Payment`.
     *
     * @param query - Page, size and the filters.
     * @returns A promise resolving with the page's refunds.
     */
    const fetchRefundsPage = (query: ListRefundsParams) =>
        fetchAny(() =>
            listRefunds(query).then((response) => {
                refundsPage.value = response.items;
                refundsTotal.value = response.meta.totalItems;
                return refundsPage.value;
            })
        );

    /**
     * Loads what needs a person (`GET /payments/attention`). Unpaged: each source is capped
     * server-side, and a fixed problem disappears on the next read.
     *
     * @returns A promise resolving with the items.
     */
    const fetchAttention = () =>
        fetchAny(() =>
            listPaymentAttention().then((response) => {
                attention.value = response.items;
                return attention.value;
            })
        );

    return {
        loading,
        payment,
        paymentsPage,
        paymentsTotal,
        refundsPage,
        refundsTotal,
        attention,
        awaitingPage,
        awaitingTotal,
        readPaymentForOrder,
        fetchPaymentsPage,
        fetchAwaitingPage,
        fetchRefundsPage,
        fetchAttention,
        methods,
        fetchMethods,
        fetchPaymentForOrder,
        payForOrder,
        finishAtProvider,
        refundPayment,
        settleRefundByHand,
        recordOfflinePayment,
        findOrderIdByReference
    };
});
