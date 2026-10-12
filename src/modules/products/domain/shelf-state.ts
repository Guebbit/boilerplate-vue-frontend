/**
 * @module
 * What a shopper is told about a product's shelf, in one value: off sale outranks a preorder,
 * which outranks the stock badge. Pure: reads only the flags every reader gets (`purchasable`,
 * `preorder`, `inStock`), never a count.
 * One home so the card, the product page and the add-to-cart button never disagree.
 */
import type { Product } from '@types';

/**
 * The shelf as a shopper sees it: `off-sale` ("Not available right now"), `preorder` (buyable now,
 * ships from its release date), `out-of-stock`, or `in-stock`.
 */
export type ShelfState = 'off-sale' | 'preorder' | 'out-of-stock' | 'in-stock';

/**
 * Ranks the product's flags into the one state to show.
 *
 * @param product - The product, as any reader gets it.
 * @returns `off-sale` when `purchasable` is `false`, else `preorder` when the server says the
 *  product is sold before its release date (its shelf may be empty: units are claimed against
 *  the preorder allowance, not the shelf), else `out-of-stock` when nothing is left, else
 *  `in-stock`. An absent `purchasable` reads as on sale.
 */
export const shelfStateOf = ({
    purchasable,
    preorder,
    inStock
}: Pick<Product, 'purchasable' | 'preorder' | 'inStock'>): ShelfState => {
    if (purchasable === false) return 'off-sale';
    if (preorder === true) return 'preorder';
    return inStock ? 'in-stock' : 'out-of-stock';
};
