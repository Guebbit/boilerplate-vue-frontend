/**
 * @module
 * What a shopper is told about a product's shelf, in one value: off sale outranks the stock
 * badge. Pure: reads only the flags every reader gets (`purchasable`, `inStock`), never a count.
 * One home so the card, the product page and the add-to-cart button never disagree.
 */
import type { Product } from '@types';

/**
 * The shelf as a shopper sees it: `off-sale` ("Not available right now"), `out-of-stock`, or
 * `in-stock`.
 */
export type ShelfState = 'off-sale' | 'out-of-stock' | 'in-stock';

/**
 * Ranks the product's flags into the one state to show.
 *
 * @param product - The product, as any reader gets it.
 * @returns `off-sale` when `purchasable` is `false`, else `out-of-stock` when nothing is left,
 *  else `in-stock`. An absent `purchasable` reads as on sale.
 */
export const shelfStateOf = ({
    purchasable,
    inStock
}: Pick<Product, 'purchasable' | 'inStock'>): ShelfState => {
    if (purchasable === false) return 'off-sale';
    return inStock ? 'in-stock' : 'out-of-stock';
};
