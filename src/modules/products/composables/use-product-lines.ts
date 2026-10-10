/**
 * @module
 * The product join a list of id-only lines needs (the cart's, the wishlist's): load the records
 * in one batch, then read a line's product and title off the products dictionary — the same
 * record the product page shows, never a copy held by the line's own module.
 */
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import type { LineAvailability, Product } from '@types';
import { useProductsStore } from '../store';

/**
 * What {@link useProductLines} hands a view.
 */
export interface ProductLines {
    /**
     * Loads (fresh) the products behind a set of lines, in one request per hundred ids.
     *
     * @param productIds - The lines' product ids.
     * @returns A promise settling once the records are in the dictionary.
     */
    loadProducts: (productIds: string[]) => Promise<unknown>;

    /**
     * The product behind a line, or `undefined` while loading or when the shopper can no longer
     * see it.
     *
     * @param productId - The line's product id.
     */
    productOf: (productId: string) => Product | undefined;

    /**
     * A human name for a line — the product's title, or "no longer available" once the request
     * has settled without it. Blank while the request is still out, and never the raw id, which
     * reads as a UUID to a screen reader.
     *
     * @param productId - The line's product id.
     */
    titleOf: (productId: string) => string;

    /**
     * The short label a line wears for its availability: "Sold out", "Not available right now",
     * "No longer available", "Not enough in stock". Nothing for `in_stock`, which needs none.
     *
     * @param availability - The line's `availability` from the server.
     * @returns The label, or `undefined` for a line that can be bought as it stands.
     */
    availabilityLabel: (availability: LineAvailability) => string | undefined;

    /**
     * Whether a line's product is gone for this shopper: its read has settled without it, which
     * is how a hidden or deleted product looks from the outside. `false` while a read is out.
     *
     * @param productId - The line's product id.
     */
    isRemoved: (productId: string) => boolean;
}

/**
 * The label key of every availability that has one, as literals so a translation check can see
 * each of them.
 */
const LABEL_KEYS: Record<Exclude<LineAvailability, 'in_stock'>, string> = {
    insufficient_stock: 'product-lines.insufficient-stock',
    out_of_stock: 'product-lines.out-of-stock',
    unavailable: 'product-lines.unavailable',
    removed: 'product-lines.removed'
};

/**
 * The line-to-product join, bound to the products store and the active language.
 *
 * @returns Its readers; call once in a component's setup.
 */
export const useProductLines = (): ProductLines => {
    const { t } = useI18n();
    const store = useProductsStore();
    const { products, loading } = storeToRefs(store);

    const productOf = (productId: string): Product | undefined => products.value[productId];

    return {
        loadProducts: (productIds) =>
            productIds.length > 0 ? store.fetchProductsByIds(productIds) : Promise.resolve([]),
        productOf,
        titleOf: (productId) =>
            productOf(productId)?.title ?? (loading.value ? '' : t('product-lines.removed')),
        availabilityLabel: (availability) =>
            availability === 'in_stock' ? undefined : t(LABEL_KEYS[availability]),
        isRemoved: (productId) => !loading.value && productOf(productId) === undefined
    };
};
