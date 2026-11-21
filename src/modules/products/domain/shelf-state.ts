/**
 * @module
 * What a shopper is told about a product's shelf, in one value. Off sale outranks the server's
 * `availability`, which is Google Merchant's (`in_stock`, `out_of_stock`, `preorder`, `backorder`).
 * Pure: reads the product's `purchasable` and its availability, never a count.
 * One home so the card, the product page and the add-to-cart button never disagree.
 */
import type { Product, ProductAvailability } from '@types';

/**
 * The shelf as a shopper sees it: `off-sale` ("Not available right now"), `preorder` (buyable now,
 * ships from its release date), `backorder` (buyable now, out of stock, ships by its restock date or
 * within 30 days), `out-of-stock`, or `in-stock`.
 */
export type ShelfState = 'off-sale' | 'preorder' | 'backorder' | 'out-of-stock' | 'in-stock';

/**
 * Ranks the product's flag and its availability into the one state to show.
 *
 * @param product - The product's details; only `purchasable` is read. An absent one reads as on sale.
 * @param availability - What `GET /products/{id}/availability` answered, `undefined` while it is not loaded.
 * @returns `off-sale` when `purchasable` is `false` (the server calls that `out_of_stock` too; the
 *  details tell them apart), else the availability's own state, or `undefined` while it is unknown.
 */
export const shelfStateOf = (
    { purchasable }: Pick<Product, 'purchasable'>,
    availability: Pick<ProductAvailability, 'availability'> | undefined
): ShelfState | undefined => {
    if (purchasable === false) return 'off-sale';
    switch (availability?.availability) {
        case 'in_stock': {
            return 'in-stock';
        }
        case 'preorder': {
            return 'preorder';
        }
        case 'backorder': {
            return 'backorder';
        }
        case 'out_of_stock': {
            return 'out-of-stock';
        }
        default: {
            return undefined;
        }
    }
};
