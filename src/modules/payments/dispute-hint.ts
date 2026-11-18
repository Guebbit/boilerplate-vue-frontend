/**
 * @module
 * Which way a refund the bank's dispute refused should go, read off the payment's dispute outcomes.
 * The server decides what is ALLOWED (`actions.settleRefundByHand`, `actions.cancelRefund`); this
 * only tells staff which of the two allowed buttons the dispute's outcome points to.
 */
import type { Payment, Refund } from '@types';

/**
 * What the disputes say about a refused refund: the bank kept the money (`lost`) or the shop did
 * (`won`).
 */
export type DisputeHint = 'lost' | 'won';

/**
 * The suggested way out for a refund refused as `disputed`.
 *
 * A lost (or accepted) chargeback wins over a won one: the bank paid the buyer, so the refund is
 * reported returned. Only chargebacks count: an inquiry takes no money either way.
 *
 * @param payment - The payment the refund sits on, with the disputes the server sent.
 * @param refund - The refund record.
 * @returns `lost` (Mark returned), `won` (Cancel refund, then refund by card), or `undefined` when
 *   the refund was not refused as disputed or no chargeback has an outcome.
 */
export const disputeHintFor = (
    payment: Pick<Payment, 'disputes'>,
    refund: Pick<Refund, 'failureReason'>
): DisputeHint | undefined => {
    if (refund.failureReason !== 'disputed') return undefined;
    const chargebacks = (payment.disputes ?? []).filter((dispute) => dispute.kind === 'chargeback');
    if (chargebacks.some((dispute) => dispute.status === 'lost' || dispute.status === 'accepted'))
        return 'lost';
    return chargebacks.some((dispute) => dispute.status === 'won') ? 'won' : undefined;
};
