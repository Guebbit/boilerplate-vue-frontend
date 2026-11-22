/**
 * @module
 * What shoppers are told about each product's stock, held here so the screens that show it can read
 * it without importing the module that fills it.
 *
 * Why it is here and not in `products`: the product views (card, page, edit form) need the answer as
 * a VALUE (a badge, a stock label, a hint), which a slot cannot hand back to its host. Why it is not
 * in `products`' own store: `inventory` is the backend owner of the read (`GET /products/{id}/availability`)
 * and `inventory` already depends on `products`, so `products` importing it back would be a cycle.
 * So the state sits in the kernel, like `work-counts.ts`: one writer (`inventory`, through its
 * `AvailabilityWatcher` that a product view renders from the `availability-watch` slot), many
 * readers (`products`, `cart`, `stock-alerts`).
 *
 * Kept apart from the product record on purpose: a product's details are cached for minutes while
 * its availability changes with every sale, and the toolkit's `addRecord` replaces a whole record,
 * so a merged field would be wiped by the next details fetch.
 *
 * @see docs/modules/products.md#availability
 */
import { ref } from 'vue';
import type { ProductAvailability } from '@types';

/**
 * What is remembered about one product: the answer (absent when the server left the product out:
 * unknown, or hidden from this viewer) and when it was asked, in epoch milliseconds.
 */
interface AvailabilityEntry {
    answer: ProductAvailability | undefined;
    askedAt: number;
}

/**
 * Every product asked about so far, by product id. Module-level so the readers and the writer share it.
 */
const entries = ref<Record<string, AvailabilityEntry | undefined>>({});

/**
 * The shelf count a stock reader sees beside the signal, by product id.
 */
const stockCounts = ref<Record<string, number | undefined>>({});

/**
 * What a shopper may know about one product's stock.
 *
 * @returns Its answer, or `undefined` while it is not loaded and for a product the server left out
 *  (see {@link isLeftOut}).
 */
export const availabilityOf = (productId: string): ProductAvailability | undefined =>
    entries.value[productId]?.answer;

/**
 * Whether the server was asked and left the product out: it does not exist, or this viewer may not
 * see it (a hidden product to a guest).
 */
export const isLeftOut = (productId: string): boolean => {
    const entry = entries.value[productId];
    return entry !== undefined && entry.answer === undefined;
};

/**
 * When the product was last asked about, for the writer to decide whether to ask again.
 *
 * @returns Epoch milliseconds, or `undefined` when it never was.
 */
export const availabilityAskedAt = (productId: string): number | undefined =>
    entries.value[productId]?.askedAt;

/**
 * Record what the server answered for one product. Only `inventory` calls this.
 *
 * @param answer - The server's answer, `undefined` when it left the product out.
 * @param askedAt - When it was asked, in epoch milliseconds.
 */
export const recordAvailability = (
    productId: string,
    answer: ProductAvailability | undefined,
    askedAt: number
): void => {
    entries.value[productId] = { answer, askedAt };
};

/**
 * The shelf count of one product, for a viewer who may read stock.
 *
 * @returns The count, or `undefined` for everyone else and until it arrives.
 */
export const stockCountOf = (productId: string): number | undefined => stockCounts.value[productId];

/**
 * Record (or forget, with `undefined`) one product's shelf count. Only `inventory` calls this.
 *
 * @param count - The count the inventory level answered.
 */
export const recordStockCount = (productId: string, count: number | undefined): void => {
    stockCounts.value[productId] = count;
};

/**
 * Forget everything: the person who read it is gone, and staff see hidden products a guest does not.
 */
export const clearAvailability = (): void => {
    entries.value = {};
    stockCounts.value = {};
};
