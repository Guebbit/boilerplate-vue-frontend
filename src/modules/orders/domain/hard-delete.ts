/**
 * @module
 * The rules behind the row's delete and permanent-delete actions, mirrored from the API so a button
 * is never offered for a refusal the server would answer with 409 (`ORDER_NOT_CANCELLED`,
 * `ORDER_INVOICED`).
 * Pure: reads two fields of the order, no Vue, no I/O.
 */

/**
 * The slice of an order the rule reads.
 */
export interface HardDeletableOrder {
    /** Lifecycle status; only `cancelled` has finished every side effect a cancel owns. */
    status: string;
    /** Money state; `unpaid` is the only value that means the order was never paid. */
    paymentStatus: string;
}

/**
 * Whether an order may be permanently deleted: cancelled first, and never paid.
 *
 * @param order - The order, as the list reads it.
 * @returns `true` when the API will accept a hard delete of it.
 */
export const canHardDelete = (order: HardDeletableOrder): boolean =>
    order.status === 'cancelled' && order.paymentStatus === 'unpaid';

/**
 * Whether an order may be hidden (soft-deleted): only a cancelled one. An open order could still be
 * paid or shipped while its buyer could neither see, cancel nor withdraw it, so it is cancelled
 * first (which refunds a paid one).
 *
 * @param order - The order, as the list reads it.
 * @returns `true` when the API will accept a soft delete of it.
 */
export const canSoftDelete = (order: Pick<HardDeletableOrder, 'status'>): boolean =>
    order.status === 'cancelled';
