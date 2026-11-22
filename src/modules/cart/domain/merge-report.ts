/**
 * @module
 * The merge report's rules: which of the lines `POST /cart/merge` answered with are worth telling
 * the shopper about, and what kind of news each is. Pure: no store, no markup. The server answers
 * one result per submitted line plus a warning for each line stock held back; a line that landed
 * exactly as asked is not news.
 */
import type { CartWarning, CartWarningCode, MergeLineReason, MergeLineResult } from '@types';

/**
 * One line of the merge report: a guest line whose quantity is not what the guest asked for, that
 * stock held back (short, sold out, off sale), or that could not be added at all.
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
     * What stock did to the line: fewer could be bought, or none; absent when stock held nothing back.
     */
    warning?: CartWarningCode | undefined;
}

/**
 * What kind of news a report line is. `gone` outranks the rest: a product that cannot be added at
 * all (removed from the catalogue, or no line left for it in a full cart) has no stock question
 * left to ask. `sold-out` is stock that cannot be bought (sold out or off sale), `short` is fewer
 * than asked, `changed` is a quantity that only differs from what was asked.
 */
export type MergeReportKind = 'gone' | 'sold-out' | 'short' | 'changed';

/**
 * Keeps the lines of a merge answer worth telling about, in the order the server gave them.
 *
 * @param lines - The answer's `lines`: one result per submitted line.
 * @param warnings - The answer's `warnings`: one per line stock held back; absent when none was.
 * @returns The lines that carry a `reason` or a warning, each with the warning stock gave it.
 */
export const changedMergeLines = (
    lines: readonly MergeLineResult[],
    warnings: readonly CartWarning[] = []
): MergeReportLine[] => {
    /**
     * A product listed twice has two results and may have two warnings; each warning goes to the
     * result that ended at its `resulting`, the order the server wrote them in.
     */
    const pending = [...warnings];
    return lines.flatMap(({ productId, requested, resulting, reason }) => {
        const at = pending.findIndex(
            (warning) => warning.productId === productId && warning.resulting === resulting
        );
        const warning = at === -1 ? undefined : pending.splice(at, 1)[0];
        return reason === undefined && warning === undefined
            ? []
            : [{ productId, requested, resulting, reason, warning: warning?.code }];
    });
};

/**
 * Sorts a report line into the kind of sentence it needs.
 *
 * @param line - A line of the report.
 * @returns `gone` for a product that could not be added (`removed` or `cart_full`), `sold-out` for
 *  one that cannot be bought, `short` for one stock only partly covers, `changed` for one whose
 *  quantity only differs from what was asked.
 */
export const mergeReportKind = ({ reason, warning }: MergeReportLine): MergeReportKind => {
    if (reason === 'removed' || reason === 'cart_full') return 'gone';
    if (warning === 'MERCHANDISE_OUT_OF_STOCK') return 'sold-out';
    return warning === 'MERCHANDISE_NOT_ENOUGH_STOCK' ? 'short' : 'changed';
};
