/**
 * @module
 * Reorder, read back. Pure: no Vue, no store.
 * The server answers one result per order line (the merge's own shape), so what did not land is
 * read off those results and never guessed from which products the cart now holds.
 * See `docs/theory/domain-layer.md`.
 */
import type { MergeLineResult } from '@types';

/**
 * A line of a past order, as far as this rule reads it.
 */
export interface ReorderedOrderLine {
    /** The product the line bought, frozen on the order. */
    product: { id: string; title?: string };
}

/**
 * What a reorder did not do cleanly, as display names in the order's own order.
 */
export interface ReorderOutcome {
    /** Products the cart did not take at all: gone from the catalogue. */
    gone: string[];
    /** Products added only in part, or not at all, because the line is at the cart's cap. */
    capped: string[];
}

/**
 * Sorts a reorder answer's lines into the two kinds of news.
 *
 * `summed` is not news: the shopper asked for the order added on top of the cart.
 *
 * @param orderLines - the order's lines
 * @param results - the answer's `lines`: one result per order line
 * @returns the display names of the products left out and of those held back at the cap
 */
export const reorderOutcome = (
    orderLines: readonly ReorderedOrderLine[],
    results: readonly MergeLineResult[]
): ReorderOutcome => {
    const nameOf = new Map(
        orderLines.map(({ product }) => [product.id, product.title || product.id])
    );
    const named = (reason: MergeLineResult['reason']): string[] =>
        results
            .filter((result) => result.reason === reason)
            .map(({ productId }) => nameOf.get(productId) ?? productId);

    return { gone: named('removed'), capped: named('capped') };
};
