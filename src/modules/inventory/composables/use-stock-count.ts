/**
 * @module
 * The shelf count a stock reader sees beside the availability signal, read from the inventory
 * level (`GET /inventory/levels/{id}`, the staff read) and written to `availability.ts` in `products` for
 * the product page to show. Everyone else makes no request.
 */
import { watch } from 'vue';
import { getInventoryLevel } from '@api';
import { recordStockCount } from '@/modules/products';
import { useSessionStore } from '@/infrastructure/session.ts';
import { debug } from '@/infrastructure/utils/logger.ts';

/**
 * Reads the shelf count of each product on screen for a holder of `read:StockLevel`.
 *
 * @param productIds - The products on screen, as a getter so a route change is followed.
 */
export const useStockCount = (productIds: () => readonly string[]): void => {
    const session = useSessionStore();

    watch(
        () => [productIds(), session.can('read', 'StockLevel')] as const,
        ([ids, mayRead]) => {
            for (const productId of ids) {
                recordStockCount(productId, undefined);
                if (!mayRead) continue;
                getInventoryLevel(productId)
                    .then((level) => {
                        recordStockCount(productId, level.available);
                    })
                    .catch((error: unknown) => {
                        // A bonus beside the signal: the page already says whether it can be ordered.
                        debug('http', 'stock count read failed, showing the signal alone', error);
                    });
            }
        },
        { immediate: true }
    );
};
