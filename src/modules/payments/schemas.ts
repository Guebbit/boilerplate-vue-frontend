/**
 * @module
 * The contract's bounds for the payments forms, re-exported because a component does not import
 * `@api/schemas`. `offlineReferenceMax` is the longest reference on an offline payment;
 * `cancelRefundNoteMax` the longest note on a voided refund.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { cancelRefundBodyNoteMax } from '@api/schemas';

export {
    recordOrderPaymentBodyReferenceMax as offlineReferenceMax,
    cancelRefundBodyNoteMax as cancelRefundNoteMax
} from '@api/schemas';

/**
 * Staff's note on a voided refund: required, because the audit must say why, within the
 * operation's cap.
 */
export const cancelRefundNoteSchema = z
    .string()
    .trim()
    .min(1, { error: () => translate('refund-cancel-form.error-note-required') })
    .max(cancelRefundBodyNoteMax, {
        error: () =>
            translate('refund-cancel-form.error-note-too-long', { max: cancelRefundBodyNoteMax })
    });
