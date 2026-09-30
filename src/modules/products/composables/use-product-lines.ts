/**
 * @module
 * The product join a list of id-only lines needs (the cart's, the wishlist's): load the records
 * in one batch, then read a line's product and title off the products dictionary — the same
 * record the product page shows, never a copy held by the line's own module.
 */
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import type { Product } from '@types';
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
}

/**
 * The line-to-product join, bound to the products store and the active language.
 *
 * @returns Its three readers; call once in a component's setup.
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
            productOf(productId)?.title ?? (loading.value ? '' : t('product-lines.unavailable'))
    };
};
