import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { listStockMovements, restockProduct } from '@api';
import type { StockMovement } from '@types';

/**
 * The stock ledger — read newest-first, written only by the API's own movements. The one write
 * this store can make is the restock, which reloads the ledger it just extended: the row worth
 * rendering is the API's, never a local guess.
 */
export const useInventoryStore = defineStore('inventory', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<StockMovement, string>({
        getLoading,
        setLoading
    });

    /** The latest movements, as last fetched. */
    const movements = ref<StockMovement[]>([]);

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
     * Puts units on a shelf, then reloads the ledger the restock just extended.
     *
     * @param productId - The product.
     * @param quantity - How many units arrived.
     * @returns A promise resolving with the shelf count after the delivery.
     */
    const restock = (productId: string, quantity: number) =>
        fetchAny(() =>
            restockProduct({ productId, quantity }).then((response) =>
                fetchMovements().then(() => response.data?.stock ?? 0)
            )
        );

    return {
        loading,
        movements,
        fetchMovements,
        restock
    };
});
