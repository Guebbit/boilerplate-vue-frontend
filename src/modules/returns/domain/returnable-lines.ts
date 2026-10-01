/**
 * @module
 * What a customer can still send back from one order: the pure arithmetic behind the returns
 * form. The server re-checks all of it (`POST /returns` refuses too many, an excluded line, a
 * closed window), so this only decides what the form offers.
 */
import type { Order, Return } from '@types';

/**
 * One order line the returns form may offer.
 */
export interface ReturnableLine {
    /** The product the line is for — what `POST /returns` names a line by. */
    productId: string;
    /** The title frozen on the order line. */
    title: string;
    /** How many of it the order held. */
    ordered: number;
    /** How many of those no earlier return has already taken: the form's upper bound. */
    remaining: number;
}

/**
 * Order statuses with goods on their way or arrived: the only ones the server accepts a
 * non-withdrawal return from (before dispatch there is nothing to send back).
 */
const RETURNABLE_ORDER_STATUSES = new Set(['shipped', 'delivered']);

/**
 * Whether goods have left the shop, so a return can exist at all.
 *
 * @param status - The order's status.
 * @returns `true` for `shipped` and `delivered`.
 */
export const isReturnableOrderStatus = (status: string | undefined): boolean =>
    status !== undefined && RETURNABLE_ORDER_STATUSES.has(status);

/**
 * Totals a quantity per product, keeping first-seen order.
 *
 * @param entries - `[productId, quantity]` pairs, a product possibly repeated.
 * @returns The summed quantity per product id.
 */
const sumByProduct = (entries: Iterable<readonly [string, number]>): Map<string, number> => {
    const totals = new Map<string, number>();
    for (const [productId, quantity] of entries)
        totals.set(productId, (totals.get(productId) ?? 0) + quantity);
    return totals;
};

/**
 * The lines a customer can still return: each product's ordered quantity less what earlier,
 * not-declined returns hold, leaving out goods with no right of withdrawal (EU Art. 16) and
 * anything already fully returned.
 *
 * @param items - The order's lines.
 * @param returns - Every return already opened on the order.
 * @returns The offerable lines, in order-line order.
 */
export const returnableLines = (
    items: readonly Order['items'][number][],
    returns: readonly Return[]
): ReturnableLine[] => {
    const held = sumByProduct(
        returns
            .filter(({ status }) => status !== 'declined')
            .flatMap(({ lines }) =>
                lines.map(({ productId, quantity }) => [productId, quantity] as const)
            )
    );
    const eligible = items.filter(({ product }) => !product.noWithdrawal);
    const ordered = sumByProduct(eligible.map(({ product, quantity }) => [product.id, quantity]));
    const seen = new Set<string>();
    const lines: ReturnableLine[] = [];
    for (const { product } of eligible) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        const total = ordered.get(product.id) ?? 0;
        const remaining = total - (held.get(product.id) ?? 0);
        if (remaining > 0)
            lines.push({ productId: product.id, title: product.title, ordered: total, remaining });
    }
    return lines;
};
