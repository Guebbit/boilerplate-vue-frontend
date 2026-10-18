/**
 * @module
 * What a shopper is told about a product's shelf, in one value: off sale outranks a preorder,
 * which outranks the stock badge, unless the preorder's allowance is full; an empty shelf of a
 * product the shop keeps selling reads backorder. Pure: reads only the flags every reader gets
 * (`purchasable`, `preorder`, `backorder`, `inStock`), never a count.
 * One home so the card, the product page and the add-to-cart button never disagree.
 */
import type { Product } from '@types';

/**
 * The shelf as a shopper sees it: `off-sale` ("Not available right now"), `preorder` (buyable now,
 * ships from its release date), `backorder` (buyable now, out of stock, ships by its restock date or
 * within 30 days), `out-of-stock`, or `in-stock`.
 */
export type ShelfState = 'off-sale' | 'preorder' | 'backorder' | 'out-of-stock' | 'in-stock';

/**
 * Ranks the product's flags into the one state to show.
 *
 * @param product - The product, as any reader gets it.
 * @returns `off-sale` when `purchasable` is `false`, else `preorder` when the server says the
 *  product is sold before its release date and some of its allowance is left (`inStock` counts
 *  the allowance for a preorder, not the shelf), else `backorder` when the shelf is empty but the
 *  shop keeps selling, else `out-of-stock` when nothing is left, else `in-stock`. An absent
 *  `purchasable` reads as on sale.
 */
export const shelfStateOf = ({
    purchasable,
    preorder,
    backorder,
    inStock
}: Pick<Product, 'purchasable' | 'preorder' | 'backorder' | 'inStock'>): ShelfState => {
    if (purchasable === false) return 'off-sale';
    if (!inStock) return backorder === true ? 'backorder' : 'out-of-stock';
    return preorder === true ? 'preorder' : 'in-stock';
};
