/**
 * @module
 * Pinia store for back-in-stock requests. Every action replaces the local list wholesale with the
 * payload the API answered, so the "you'll be told" state can never disagree with the server.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { listStockAlerts, createStockAlert, deleteStockAlert } from '@api';
import type { StockAlert } from '@types';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';

/**
 * The signed-in shopper's open "notify me" requests: product ids and when they asked. A request is
 * used once, so an answered one is gone from the list the next time it is read.
 */
export const useStockAlertsStore = defineStore('stock-alerts', () => {
    /**
     * The toolkit's REST slice: the loading flag and the `fetchAny` wrapper every action goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<StockAlert, string>({
        resourceKey: 'stock-alerts',
        queryClient
    });

    /**
     * The open requests, newest first.
     */
    const items = ref<StockAlert[]>([]);

    /**
     * Product ids with an open request, for O(1) "already asked" reads.
     */
    const askedProductIds = computed(() => new Set(items.value.map(({ productId }) => productId)));

    /**
     * Whether the shopper already asked about one product — what the button reads.
     *
     * @param productId - The product in question.
     * @returns `true` while a request is open.
     */
    const isAsked = (productId: string) => askedProductIds.value.has(productId);

    /**
     * One read in flight, or already answered for this person: fifty cards on a grid cost a single
     * `GET /stock-alerts`. `undefined` until the first ask, and again after a failure or a change
     * of person.
     */
    let shared: Promise<StockAlert[] | undefined> | undefined;

    /**
     * A call that answers with the whole list, stored as the new local list.
     *
     * @param call - The generated client call.
     * @returns A promise resolving with the list the store holds.
     */
    const replaceItems = (call: () => Promise<{ data: { items: StockAlert[] } }>) =>
        fetchAny(() =>
            call().then(({ data }) => {
                items.value = data.items;
                return items.value;
            })
        );

    /**
     * Loads the shopper's open requests.
     *
     * @returns A promise resolving with the list.
     */
    const fetchStockAlerts = () => replaceItems(() => listStockAlerts());

    /**
     * The list for a button that only needs to know what was asked: the first call reads it, every
     * later call reuses that read.
     *
     * @returns A promise resolving with the list.
     */
    const ensureStockAlerts = () => {
        shared ??= fetchStockAlerts().catch((error: unknown) => {
            shared = undefined;
            throw error;
        });
        return shared;
    };

    /**
     * Asks to be told when a product can be ordered again: `POST /stock-alerts/{productId}`.
     * Idempotent server-side, so a double click answers the same list.
     *
     * @param productId - The product to wait for.
     * @returns A promise resolving with the updated list.
     */
    const ask = (productId: string) => replaceItems(() => createStockAlert(productId));

    /**
     * Cancels a request before it is answered.
     *
     * @param productId - The product to stop waiting for.
     * @returns A promise resolving with the updated list.
     */
    const cancel = (productId: string) => replaceItems(() => deleteStockAlert(productId));

    /**
     * Forgets the previous person's requests, so the next person's button asks the server.
     */
    useResetOnViewerChange(() => {
        items.value = [];
        shared = undefined;
    });

    return { items, isAsked, loading, fetchStockAlerts, ensureStockAlerts, ask, cancel };
});
