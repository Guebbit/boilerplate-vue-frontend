/**
 * @module
 * Pinia store for the inventory domain. Wraps `useStructureRestApi` for its shared loading
 * bookkeeping; the two reads are whole-list replacement and the three writes reload both views
 * before resolving, so no caller ever observes a counter the views have not caught up with.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    adjustStock,
    listInventoryLevels,
    listStockMovements,
    receiveStock,
    sweepReservations
} from '@api';
import type {
    InventoryLevel,
    StockMovement,
    ListInventoryLevelsParams,
    ListStockMovementsParams
} from '@types';

/**
 * The stock board and the ledger behind it.
 *
 * Two reads and three writes, and the split between the writes is the domain's, not this store's:
 *
 * - a RECEIPT is stock arriving. `onHand` rises, `reserved` does not, so the delivery is available
 *   immediately. Strictly positive — a delivery that removes units is not a delivery.
 * - an ADJUSTMENT is a stocktake correction, and it is SIGNED, because shrinkage is the common
 *   case and it is negative. The API refuses to take `onHand` below what is already reserved.
 * - the SWEEP releases every hold whose window has closed. A job behind an admin endpoint — the
 *   API ships no scheduler, so the tick is driven from outside, and this store is one of the
 *   outsides. Idempotent; running it twice releases nothing the first run already released.
 *
 * All three answer with (or change) the counters, and all three reload the views they touched:
 * the row worth rendering is the API's, never a local guess. That is also why nothing here does
 * arithmetic on a count — `available` is derived server-side from `onHand` and `reserved`, and a
 * second implementation of that subtraction is a second thing that can be wrong.
 *
 * Both reads keep their `meta.totalItems`, because both are paginated server-side and the ledger
 * especially is the record an audit works through — a bare row count would misreport history as
 * complete.
 */
export const useInventoryStore = defineStore('inventory', () => {
    /**
     * This store's slice of the app-wide loading registry.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Shared loading flag plus the request runner every read/write below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<StockMovement, string>({
        getLoading,
        setLoading
    });

    /**
     * The latest movements, as last fetched.
     */
    const movements = ref<StockMovement[]>([]);

    /**
     * How many movements match the last filters, across every page.
     */
    const movementsTotal = ref(0);

    /**
     * The last movements query, so a write can reload the page being looked at.
     */
    let movementsQuery: ListStockMovementsParams = {};

    /**
     * The current shelf counts, one row per product on the current page.
     */
    const levels = ref<InventoryLevel[]>([]);

    /**
     * How many products the board holds, across every page.
     */
    const levelsTotal = ref(0);

    /**
     * The last levels query, for the same reload-what-is-shown reason.
     */
    let levelsQuery: ListInventoryLevelsParams = {};

    /**
     * Loads a page of the ledger.
     *
     * @param query - Page, size, and the two narrowings: one product's story, one kind of
     *  transition. Omitted, the last query is repeated — which is what a reload after a write
     *  wants, since the visitor is still looking at the same page.
     * @returns A promise resolving with the movements.
     */
    const fetchMovements = (query?: ListStockMovementsParams) =>
        fetchAny(() => {
            if (query) movementsQuery = query;
            return listStockMovements(movementsQuery).then((response) => {
                movements.value = response.data.items;
                movementsTotal.value = response.data.meta.totalItems;
                return movements.value;
            });
        });

    /**
     * Loads a page of the stock board, most scarce first.
     *
     * @param query - Page, size, and `lowOnly` — only products at or under the server's
     *  low-availability threshold. Omitted, the last query is repeated.
     * @returns A promise resolving with the levels.
     */
    const fetchLevels = (query?: ListInventoryLevelsParams) =>
        fetchAny(() => {
            if (query) levelsQuery = query;
            return listInventoryLevels(levelsQuery).then((response) => {
                levels.value = response.data.items;
                levelsTotal.value = response.data.meta.totalItems;
                return levels.value;
            });
        });

    /**
     * Receives a delivery, then reloads what it changed.
     *
     * @param productId - The product the units arrived for.
     * @param quantity - How many arrived. Strictly positive.
     * @param note - The supplier, the delivery note number — whatever belongs on the row.
     * @returns A promise resolving with the counters after the delivery.
     */
    const receive = (productId: string, quantity: number, note?: string) =>
        fetchAny(() =>
            receiveStock({ productId, quantity, note }).then((response) =>
                reloadAfterWrite(response.data)
            )
        );

    /**
     * Corrects the count after a stocktake, then reloads what it changed.
     *
     * @param productId - The product being corrected.
     * @param delta - Signed: negative for shrinkage, which is the common case.
     * @param note - Why. An unexplained correction is the thing an audit is looking for.
     * @returns A promise resolving with the counters after the correction.
     */
    const adjust = (productId: string, delta: number, note?: string) =>
        fetchAny(() =>
            adjustStock({ productId, delta, note }).then((response) =>
                reloadAfterWrite(response.data)
            )
        );

    /**
     * Expires every stale reservation, then reloads both views — released holds moved `reserved`.
     *
     * @returns A promise resolving with how many holds this run released.
     */
    const sweep = () =>
        fetchAny(() =>
            sweepReservations().then((response) =>
                fetchMovements()
                    .then(() => fetchLevels())
                    .then(() => response.data.expired)
            )
        );

    /**
     * Both counter writes change the same two things, so they refresh the same two things.
     *
     * Sequential rather than concurrent: the ledger explains the board, and a board that arrived
     * before the movement that justifies it reads as a number nobody wrote.
     *
     * @param level - The counters the write answered with.
     * @returns A promise resolving with those counters, once the views agree with them.
     */
    const reloadAfterWrite = (level: InventoryLevel | undefined) =>
        fetchMovements()
            .then(() => fetchLevels())
            .then(() => level);

    return {
        loading,
        movements,
        movementsTotal,
        levels,
        levelsTotal,
        fetchMovements,
        fetchLevels,
        receive,
        adjust,
        sweep
    };
});
