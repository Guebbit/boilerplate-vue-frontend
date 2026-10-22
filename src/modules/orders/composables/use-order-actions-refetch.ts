/**
 * @module
 * The forced re-fetch every order-detail page needs, shared so no page can omit it: without it a
 * page would silently offer no status moves. The orders list
 * seeds the store with a summary row carrying no `actions`; `watchOne`/`watchOrder` is cache-first,
 * so a page arriving from the list settles for that row unless something forces a re-fetch. Only
 * `GET /orders/:id` serves the detail representation `actions` lives on.
 */
import { watch, type Ref } from 'vue';
import type { Order } from '@types';

/**
 * Forces exactly one detail re-fetch of the current order once it resolves without `actions`.
 *
 * Runs at most once per mount, deliberately: a second forced fetch racing the toolkit's loading
 * lock would silently swallow a click (e.g. Cancel) made while it is in flight.
 *
 * @param currentOrder - The store's cache-first record for the routed id.
 * @param targetId - The routed order id, read reactively so a navigation retargets the latch.
 * @param fetchOrder - The store's fetch action, called with `{ forced: true }` to bypass the cache.
 */
export const useOrderActionsRefetch = (
    currentOrder: Ref<Order | undefined>,
    targetId: () => string | undefined,
    fetchOrder: (id: string, settings: { forced: boolean }) => Promise<Order | undefined>
): void => {
    /**
     * Whether this composable has already forced its one refetch. Reset by nothing: one per
     * mount is the whole contract.
     */
    let refreshedForActions = false;
    watch(
        currentOrder,
        (order) => {
            if (
                refreshedForActions ||
                !order ||
                order.id !== targetId() ||
                order.actions !== undefined
            )
                return;
            refreshedForActions = true;
            void fetchOrder(order.id, { forced: true });
        },
        { immediate: true }
    );
};
