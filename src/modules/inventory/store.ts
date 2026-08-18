import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { adjustStock, listInventoryLevels, listStockMovements, receiveStock } from '@api';
import type { InventoryLevel, StockMovement } from '@types';

/**
 * The stock board and the ledger behind it.
 *
 * Two reads and two writes, and the split between the writes is the domain's, not this store's:
 *
 * - a RECEIPT is stock arriving. `onHand` rises, `reserved` does not, so the delivery is available
 *   immediately. Strictly positive — a delivery that removes units is not a delivery.
 * - an ADJUSTMENT is a stocktake correction, and it is SIGNED, because shrinkage is the common
 *   case and it is negative. The API refuses to take `onHand` below what is already reserved.
 *
 * Both answer with the counters as they now stand, and both reload the ledger they just extended:
 * the row worth rendering is the API's, never a local guess. That is also why nothing here does
 * arithmetic on a count — `available` is derived server-side from `onHand` and `reserved`, and a
 * second implementation of that subtraction is a second thing that can be wrong.
 */
export const useInventoryStore = defineStore('inventory', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<StockMovement, string>({
        getLoading,
        setLoading
    });

    /** The latest movements, as last fetched. */
    const movements = ref<StockMovement[]>([]);

    /** The current shelf counts, one row per product. */
    const levels = ref<InventoryLevel[]>([]);

    /**
     * Loads the ledger.
     *
     * @param productId - Narrow to one product's story; omitted, the whole shop's.
     * @returns A promise resolving with the movements.
     */
    const fetchMovements = (productId?: string) =>
        fetchAny(() =>
            listStockMovements(productId === undefined ? undefined : { productId }).then(
                (response) => {
                    movements.value = response.data?.items ?? [];
                    return movements.value;
                }
            )
        );

    /**
     * Loads the stock board.
     *
     * @returns A promise resolving with the levels.
     */
    const fetchLevels = () =>
        fetchAny(() =>
            listInventoryLevels().then((response) => {
                levels.value = response.data?.items ?? [];
                return levels.value;
            })
        );

    /**
     * Receives a delivery, then reloads what it changed.
     *
     * @param productId - The product the units arrived for.
     * @param quantity - How many arrived. Strictly positive.
     * @returns A promise resolving with the counters after the delivery.
     */
    const receive = (productId: string, quantity: number) =>
        fetchAny(() =>
            receiveStock({ productId, quantity }).then((response) =>
                reloadAfterWrite(response.data)
            )
        );

    /**
     * Corrects the count after a stocktake, then reloads what it changed.
     *
     * @param productId - The product being corrected.
     * @param delta - Signed: negative for shrinkage, which is the common case.
     * @returns A promise resolving with the counters after the correction.
     */
    const adjust = (productId: string, delta: number) =>
        fetchAny(() =>
            adjustStock({ productId, delta }).then((response) => reloadAfterWrite(response.data))
        );

    /**
     * Both writes change the same two things, so they refresh the same two things.
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
        levels,
        fetchMovements,
        fetchLevels,
        receive,
        adjust
    };
});
