/**
 * @module
 * What a refund the operator asked for tells them, in one place: the three screens that ask for one
 * (the payment drawer, the order page, the return page) must not each decide what a refused card
 * refund means.
 */
import { EToastType } from '@guebbit/vue-toolkit';
import type { Refund } from '@types';

/**
 * The i18n function the notice is worded with: the caller's own `t`.
 */
type Translate = (key: string, parameters?: Record<string, unknown>) => string;

/**
 * A toast: its wording and its look.
 */
export interface RefundNotice {
    /** The wording, already translated. */
    text: string;
    /** `SUCCESS` for money that is back or on file, `WARNING` for a refusal that needs a person. */
    type: EToastType;
}

/**
 * What the operator should be told about the refund they just asked for.
 *
 * The server decides, the client copies: a refund the provider refused is a normal answer (201 and
 * a `failed` record), and whether the operator may settle it by hand is `actions.settleByHand`, not
 * a rule re-derived here.
 *
 * @param t - The caller's translate function.
 * @param refund - The record the request wrote; absent when the answer carried none.
 * @param settleByHand - `actions.settleByHand` of the payment, re-read after the request.
 * @param doneKey - The wording for a refund that went through, which differs per screen.
 */
export const refundNotice = (
    t: Translate,
    refund: Pick<Refund, 'id' | 'status' | 'failureReason'> | undefined,
    settleByHand: readonly string[],
    doneKey: string
): RefundNotice => {
    if (refund?.status === 'pending')
        return { text: t('refund-notice.recorded'), type: EToastType.SUCCESS };
    if (refund?.status !== 'failed') return { text: t(doneKey), type: EToastType.SUCCESS };

    const reason = refund.failureReason
        ? t(`payments-list-page.failure-reason-${refund.failureReason}`)
        : t('refund-notice.no-reason');
    const next = settleByHand.includes(refund.id)
        ? t('refund-notice.settle-by-hand')
        : t('refund-notice.retried');
    return { text: t('refund-notice.refused', { reason, next }), type: EToastType.WARNING };
};
