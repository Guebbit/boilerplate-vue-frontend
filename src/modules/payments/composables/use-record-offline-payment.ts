/**
 * @module
 * Composable wrapping the payments store's offline-recording action for a single order.
 */
import type { Ref } from 'vue';
import type { RecordOfflinePaymentRequest } from '@types';
import { usePaymentsStore } from '../store';

/**
 * The operator's "record a payment by hand" control — published where the store is not.
 *
 * Whether recording is possible is never decided here: the API is the one that knows about an
 * in-flight card charge, and a 409 from it is the caller's to show as a toast, the same way a
 * decline is the confirm's. This composable only performs the call and mirrors the result into the
 * payments store, exactly as `useOrderRefund` mirrors a refund.
 *
 * @param orderId - The order the money arrived for, reactive so a route change re-reads it.
 * @returns The call that records a payment by hand.
 */
export const useRecordOfflinePayment = (orderId: Ref<string | undefined>) => {
    /**
     * The payments store, held for its one write.
     */
    const paymentsStore = usePaymentsStore();

    return {
        /**
         * Records money that arrived outside the provider, and settles it — the order moves
         * `pending → paid` server-side.
         *
         * @param body - The method, an optional reference, and when the money actually arrived.
         * @returns A promise resolving once the refreshed payment has replaced the cached one.
         */
        recordOfflinePayment: (body: RecordOfflinePaymentRequest) =>
            orderId.value
                ? paymentsStore.recordOfflinePayment(orderId.value, body).then(() => undefined)
                : Promise.resolve()
    };
};
