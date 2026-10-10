/**
 * @module
 * The merge report's rules: which of the lines `POST /cart/merge` answered with are worth telling
 * the shopper about, and what kind of news each is. Pure: no store, no markup. The server answers
 * one result per submitted line; a line that landed exactly as asked and can be bought is not
 * news. A stock number is never here: the server answers a name, never what is for sale.
 */
import type { LineAvailability, MergeLineReason, MergeLineResult } from '@types';

/**
 * One line of the merge report: a guest line whose quantity is not what the guest asked for, that
 * cannot be bought as it stands (short, sold out, off sale), or that could not be added at all.
 */
export interface MergeReportLine {
    /**
     * The product's id.
     */
    productId: string;
    /**
     * What the guest cart held for it.
     */
    requested: number;
    /**
     * What the cart holds for it after the merge.
     */
    resulting: number;
    /**
     * Why `requested` and `resulting` differ; absent when they do not.
     */
    reason?: MergeLineReason | undefined;
    /**
     * What the line can do now: short, sold out, off sale, removed, or fine. A name, never how
     * many are for sale.
     */
    availability: LineAvailability;
}

/**
 * What kind of news a report line is. `gone` outranks the rest: a product that cannot be added at
 * all has no stock question left to ask. `off-sale` is listed but not buyable, `short` is a stock
 * matter (fewer left, or none).
 */
export type MergeReportKind = 'gone' | 'off-sale' | 'short' | 'changed';

/**
 * Whether a merge answer's line belongs in the report.
 *
 * @param line - One result of the answer.
 * @returns `true` when the quantity is not what was asked, or the line is short, or it is gone.
 */
const isNews = ({ reason, availability }: MergeLineResult): boolean =>
    reason !== undefined || availability !== 'in_stock';

/**
 * Keeps the lines of a merge answer worth telling about, in the order the server gave them.
 *
 * @param lines - The answer's `lines`: one result per submitted line.
 * @returns The lines that carry a `reason` or whose `availability` is not `in_stock`.
 */
export const changedMergeLines = (lines: readonly MergeLineResult[]): MergeReportLine[] =>
    lines
        .filter((line) => isNews(line))
        .map(({ productId, requested, resulting, reason, availability }) => ({
            productId,
            requested,
            resulting,
            reason,
            availability
        }));

/**
 * Sorts a report line into the kind of sentence it needs.
 *
 * @param line - A line of the report.
 * @returns `gone` for a product that could not be added, `off-sale` for one taken off sale,
 *  `short` for one the stock does not cover, `changed` for one whose quantity only differs from
 *  what was asked.
 */
export const mergeReportKind = ({ reason, availability }: MergeReportLine): MergeReportKind => {
    if (reason === 'removed') return 'gone';
    if (availability === 'unavailable') return 'off-sale';
    return availability === 'insufficient_stock' || availability === 'out_of_stock'
        ? 'short'
        : 'changed';
};
