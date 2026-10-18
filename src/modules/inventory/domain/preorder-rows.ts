/**
 * @module
 * The preorder board's product table is two reads joined by product: the allowance (`inventory`) and
 * the units by state (`delivery`). Neither read holds every product the other does — a product with
 * no limit left may still have paid units waiting, a freshly opened one has a limit and no sales —
 * so the table lists the union, and a missing half reads as absent, never as zero.
 */
import type { PreorderLevel, PreorderProductSummary, ReleaseDate } from '@types';

/**
 * One product's row on the board.
 */
export interface PreorderRow {
    /** The product. */
    productId: string;
    /** The product's name: the allowance's (live) when it has one, else the summary's (frozen). */
    title: string;
    /** When it ships from, as the catalogue says now; absent when the product has no allowance row. */
    releaseDate?: ReleaseDate | undefined;
    /** The allowance read, absent when the product has none (only sales to show). */
    level?: PreorderLevel | undefined;
    /** The units by state read, absent when nothing was ever sold. */
    summary?: PreorderProductSummary | undefined;
}

/**
 * Joins the two reads into one row per product, the worst first.
 *
 * @param levels - The allowance rows.
 * @param summaries - The per-product state counts.
 * @returns Rows ordered by units late (most first), then units outstanding (most first), then name.
 */
export const preorderRows = (
    levels: readonly PreorderLevel[],
    summaries: readonly PreorderProductSummary[]
): PreorderRow[] => {
    const byProduct = new Map<string, PreorderRow>();
    for (const level of levels)
        byProduct.set(level.productId, {
            productId: level.productId,
            title: level.title,
            releaseDate: level.releaseDate,
            level
        });
    for (const summary of summaries) {
        const row = byProduct.get(summary.productId);
        byProduct.set(
            summary.productId,
            row
                ? { ...row, summary }
                : { productId: summary.productId, title: summary.title, summary }
        );
    }
    return [...byProduct.values()].toSorted(
        (a, b) =>
            (b.summary?.late ?? 0) - (a.summary?.late ?? 0) ||
            (b.level?.backordered ?? 0) - (a.level?.backordered ?? 0) ||
            a.title.localeCompare(b.title)
    );
};
