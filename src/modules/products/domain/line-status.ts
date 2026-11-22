/**
 * @module
 * What a saved line (a cart line, a wishlist line) is told about its product, in one value. The
 * server answers the product's own stock answer (`availability`, `quantityAvailable`, the units
 * that ship later); which of "removed", "off sale" and "sold out" a product is comes from the
 * product details the screen already holds, because the server reads all three as `out_of_stock`.
 * Pure: no store, no copy. One home so the cart, the wishlist and the merge alert never disagree.
 */
import type { Availability } from '@types';

/**
 * The line as a shopper sees it, most severe first: `removed` (hidden, deleted), `off-sale`,
 * `sold-out`, `too-many` (the line holds more than can be bought), `preorder`, `ships-later` (all or
 * part of the line ships after the shelf), or `ok`.
 */
export type LineStatus =
    'removed' | 'off-sale' | 'sold-out' | 'too-many' | 'preorder' | 'ships-later' | 'ok';

/**
 * What decides a line's status.
 */
export interface LineFacts {
    /**
     * The product is gone for this shopper: its read settled without it, or it is hidden
     * (`active === false`, which a staff member's read still returns).
     */
    removed: boolean;
    /**
     * The product's `purchasable`; `false` takes it off sale. Absent while the details load.
     */
    purchasable?: boolean | undefined;
    /**
     * The product's own availability word; absent while the availability is loading.
     */
    availability?: Availability | undefined;
    /**
     * How many the line holds; absent for a wishlist line.
     */
    quantity?: number | undefined;
    /**
     * How many can be bought now; absent is no limit.
     */
    quantityAvailable?: number | undefined;
    /**
     * Units of the line that ship later; absent for none or when the server does not say (a wishlist line).
     */
    quantityBackordered?: number | undefined;
}

/**
 * Ranks a line's facts into the one status to show.
 *
 * @param facts - What the screen knows about the line and its product.
 * @returns The status; `ok` when nothing needs saying, including while the availability is unknown.
 */
export const lineStatusOf = ({
    removed,
    purchasable,
    availability,
    quantity,
    quantityAvailable,
    quantityBackordered
}: LineFacts): LineStatus => {
    if (removed) return 'removed';
    if (purchasable === false) return 'off-sale';
    if (availability === 'out_of_stock') return 'sold-out';
    // The way Shopify reads it: "too many" is the line against the number, not a word of its own.
    if (quantity !== undefined && quantityAvailable !== undefined && quantity > quantityAvailable)
        return 'too-many';
    if (availability === 'preorder') return 'preorder';
    if (availability === 'backorder' || (quantityBackordered ?? 0) > 0) return 'ships-later';
    return 'ok';
};
