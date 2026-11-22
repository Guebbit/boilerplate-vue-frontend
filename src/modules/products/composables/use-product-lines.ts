/**
 * @module
 * The product join a list of id-only lines needs (the cart's, the wishlist's): load the records
 * in one batch, then read a line's product and title off the products dictionary — the same
 * record the product page shows, never a copy held by the line's own module.
 */
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { formatDay } from '@/infrastructure/utils/formatters.ts';
import type { Product } from '@types';
import { useProductsStore } from '../store';
import { lineStatusOf, type LineFacts, type LineStatus } from '../domain';
import { backorderPromiseDays } from '@/modules/shop';

/**
 * What a screen knows about one line's stock: the product's own answer, and for a cart line the
 * quantity it holds and the units that ship later. The wishlist passes the answer alone.
 */
export interface LineStock extends Pick<
    LineFacts,
    'availability' | 'quantity' | 'quantityAvailable' | 'quantityBackordered'
> {
    /**
     * The product's `availabilityDate` (a calendar day): the release date of a preorder, the
     * restock date of a backorder.
     */
    availabilityDate?: string | undefined;
}

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
     * The status a line wears: removed, off sale, sold out, too many, preorder, ships later, or
     * ok. Off sale, removed and sold out are told apart from the product details, which the server
     * does not repeat on the line.
     *
     * @param productId - The line's product id.
     * @param stock - The line's stock answer.
     */
    statusOf: (productId: string, stock: LineStock) => LineStatus;

    /**
     * The short label a line wears: "Sold out", "Not available right now", "No longer available",
     * "Only {n} available", "Preorder · ships {date}", "Backorder · ships by {date}". Nothing for a
     * line that can be bought as it stands.
     *
     * @param productId - The line's product id.
     * @param stock - The line's stock answer.
     * @returns The label, or `undefined` when none is needed.
     */
    lineLabel: (productId: string, stock: LineStock) => string | undefined;

    /**
     * Whether a line's product is gone for this shopper: its read has settled without it, which
     * is how a hidden or deleted product looks from the outside, or it is hidden (`active ===
     * false`, which a staff member's read still returns). `false` while a read is out.
     *
     * @param productId - The line's product id.
     */
    isRemoved: (productId: string) => boolean;
}

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

    const isRemoved = (productId: string): boolean => {
        const product = productOf(productId);
        return !loading.value && (product === undefined || product.active === false);
    };

    const statusOf = (productId: string, stock: LineStock): LineStatus =>
        lineStatusOf({
            removed: isRemoved(productId),
            purchasable: productOf(productId)?.purchasable,
            ...stock
        });

    return {
        loadProducts: (productIds) =>
            productIds.length > 0 ? store.fetchProductsByIds(productIds) : Promise.resolve([]),
        productOf,
        titleOf: (productId) =>
            productOf(productId)?.title ?? (loading.value ? '' : t('product-lines.removed')),
        statusOf,
        lineLabel: (productId, stock) => {
            switch (statusOf(productId, stock)) {
                case 'removed': {
                    return t('product-lines.removed');
                }
                case 'off-sale': {
                    return t('product-lines.unavailable');
                }
                case 'sold-out': {
                    return t('product-lines.out-of-stock');
                }
                case 'too-many': {
                    return t('product-lines.insufficient-stock', {
                        count: stock.quantityAvailable ?? 0
                    });
                }
                case 'preorder': {
                    return stock.availabilityDate
                        ? t('product-lines.preorder', { date: formatDay(stock.availabilityDate) })
                        : t('product-lines.preorder-undated');
                }
                case 'ships-later': {
                    // A backorder always carries its promise: the server names a day, 30 from now when the shop named none.
                    return stock.availabilityDate
                        ? t('product-lines.backorder', { date: formatDay(stock.availabilityDate) })
                        : t('product-lines.backorder-undated', {
                              days: backorderPromiseDays.value
                          });
                }
                default: {
                    return undefined;
                }
            }
        },
        isRemoved
    };
};
