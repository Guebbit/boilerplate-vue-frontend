/**
 * @module
 * The merge report's rules: which of the lines `POST /cart/merge` answered with are worth telling
 * the shopper about, and what kind of news each is. Pure: no store, no markup. The server answers
 * one result per submitted line; a line that landed exactly as asked and fits the stock is not
 * news. A stock number is never here: the server answers a flag, never what is for sale.
 */
import type { MergeLineReason, MergeLineResult } from '@types';

/**
 * One line of the merge report: a guest line whose quantity is not what the guest asked for, that
 * is short of stock, or that could not be added at all.
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
     * The cart holds more of it than is for sale. A flag, never how many are.
     */
    insufficientStock: boolean;
}

/**
 * What kind of news a report line is. `gone` outranks `short`: a product that cannot be added at
 * all has no stock question left to ask.
 */
export type MergeReportKind = 'gone' | 'short' | 'changed';

/**
 * Whether a merge answer's line belongs in the report.
 *
 * @param line - One result of the answer.
 * @returns `true` when the quantity is not what was asked, or the line is short, or it is gone.
 */
const isNews = ({ reason, insufficientStock }: MergeLineResult): boolean =>
    reason !== undefined || insufficientStock;

/**
 * Keeps the lines of a merge answer worth telling about, in the order the server gave them.
 *
 * @param lines - The answer's `lines`: one result per submitted line.
 * @returns The lines that carry a `reason` or are flagged `insufficientStock`.
 */
export const changedMergeLines = (lines: readonly MergeLineResult[]): MergeReportLine[] =>
    lines
        .filter((line) => isNews(line))
        .map(({ productId, requested, resulting, reason, insufficientStock }) => ({
            productId,
            requested,
            resulting,
            reason,
            insufficientStock
        }));

/**
 * Sorts a report line into the kind of sentence it needs.
 *
 * @param line - A line of the report.
 * @returns `gone` for a product that could not be added, `short` for one the stock does not cover,
 *  `changed` for one whose quantity only differs from what was asked.
 */
export const mergeReportKind = ({
    reason,
    insufficientStock
}: MergeReportLine): MergeReportKind => {
    if (reason === 'unavailable') return 'gone';
    return insufficientStock ? 'short' : 'changed';
};
