/**
 * @module
 * Reorder, read back. Pure: no Vue, no store.
 * The server drops a line whose product has left the catalogue and answers with the cart as it now
 * stands, so what was dropped is what the order had and the cart lacks.
 * See `docs/theory/domain-layer.md`.
 */

/**
 * A line of a past order, as far as this rule reads it.
 */
export interface ReorderedOrderLine {
    /** The product the line bought, frozen on the order. */
    product: { id: string; title?: string };
}

/**
 * Which of an order's products did not land in the cart after a reorder.
 *
 * Judged by product, not quantity: a line the server clamped to the cart's own limit still landed.
 *
 * @param orderLines - the order's lines
 * @param cartProductIds - the product ids the cart holds after the reorder
 * @returns one display name per missing product, in the order's own order
 */
export const leftOutByReorder = (
    orderLines: readonly ReorderedOrderLine[],
    cartProductIds: readonly string[]
): string[] =>
    orderLines
        .filter(({ product }) => !cartProductIds.includes(product.id))
        .map(({ product }) => product.title || product.id);
