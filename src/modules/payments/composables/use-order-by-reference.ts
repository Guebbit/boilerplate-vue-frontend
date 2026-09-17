/**
 * @module
 * Composable wrapping GET /payments/order-by-reference: the admin's own step before recording an
 * offline payment for an order a bank transfer's own statement line is the only handle on.
 */
import { ref, type Ref } from 'vue';
import { getOrderByReference } from '@api';
import type { Order } from '@types';
import { rethrowUnlessAbsent } from '@/infrastructure/utils/errors';

/**
 * Everything {@link useOrderByReference} returns.
 */
export interface UseOrderByReferenceReturn {
    /**
     * The order the last successful lookup found, or `undefined` before one runs, after a miss,
     * or once {@link reset} clears it.
     */
    order: Ref<Order | undefined>;
    /**
     * Whether the last lookup answered 404 — a malformed reference and one matching no order
     * answer alike, so this is the only signal the caller gets; it must render ONE message for
     * both rather than guessing which happened.
     */
    notFound: Ref<boolean>;
    /**
     * Whether a lookup is in flight.
     */
    loading: Ref<boolean>;
    /**
     * Runs the lookup for one pasted reference.
     *
     * @param reference - The RF reference (or, for an order that predates it, the raw order id)
     *  exactly as pasted — spaces and case are the API's to tolerate, not this call's.
     * @returns A promise resolving once `order` or `notFound` is set. Rejects on anything other
     *  than a 404 (422 no reference sent, 403 not an admin, a transport failure), for the caller's
     *  own toast.
     */
    findByReference: (reference: string) => Promise<void>;
    /**
     * Clears the last result, so the caller can search again from a blank state.
     */
    reset: () => void;
}

/**
 * The admin's own step before `recordOfflinePayment`: paste the RF reference read off the bank's
 * own statement and get back the order it pays.
 *
 * @returns See {@link UseOrderByReferenceReturn}.
 */
export const useOrderByReference = (): UseOrderByReferenceReturn => {
    /**
     * The found order, mirrored from the last successful lookup.
     */
    const order = ref<Order>();

    /**
     * Whether the last lookup answered 404.
     */
    const notFound = ref(false);

    /**
     * Whether a lookup is in flight.
     */
    const loading = ref(false);

    /**
     * Runs the lookup for one pasted reference and mirrors the answer into `order`/`notFound`.
     *
     * @param reference - The RF reference, or a legacy order id, exactly as pasted.
     * @returns A promise resolving once the state is settled; rejects on anything but a 404.
     */
    const findByReference = (reference: string) => {
        loading.value = true;
        notFound.value = false;
        return getOrderByReference({ ref: reference })
            .then((response) => {
                order.value = response.data;
            })
            .catch((error: unknown) => {
                rethrowUnlessAbsent(error, 404);
                order.value = undefined;
                notFound.value = true;
            })
            .finally(() => {
                loading.value = false;
            });
    };

    /**
     * Returns to the pre-lookup state.
     */
    const reset = () => {
        order.value = undefined;
        notFound.value = false;
        loading.value = false;
    };

    return { order, notFound, loading, findByReference, reset };
};
