/**
 * @module
 * Zod field schemas for the returns forms, with i18n-thunked error messages resolved at parse time.
 * Length caps are the generated contract constants from `@api/schemas`; each form composes these
 * fields with its own reactive rules (the reason list, the picked lines).
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import {
    closeReturnBodyNoteMax,
    createReturnBodyNoteMax,
    declineReturnBodyReasonMax
} from '@api/schemas';

/**
 * Staff's reason for declining a return: required, within the decline operation's cap.
 */
export const declineReasonSchema = z
    .string()
    .trim()
    .min(1, { error: () => translate('return-staff-actions.error-reason-required') })
    .max(declineReturnBodyReasonMax, {
        error: () =>
            translate('return-staff-actions.error-reason-too-long', {
                max: declineReturnBodyReasonMax
            })
    });

/**
 * Staff's optional note when closing a return by hand, within the close operation's cap. Empty is
 * fine: closing is housekeeping, and the audit row only keeps a note when there is one.
 */
export const closeNoteSchema = z
    .string()
    .trim()
    .max(closeReturnBodyNoteMax, {
        error: () =>
            translate('return-staff-actions.error-note-too-long', { max: closeReturnBodyNoteMax })
    });

/**
 * The buyer's optional note on a return request, within the create operation's cap.
 */
export const returnNoteSchema = z
    .string()
    .trim()
    .max(createReturnBodyNoteMax, {
        error: () =>
            translate('returns-request.error-note-too-long', { max: createReturnBodyNoteMax })
    });

/**
 * The contract's bounds for the decline reason and the return note; views read them from here
 * because a component does not import `@api/schemas`.
 */
export {
    closeReturnBodyNoteMax as closeNoteMax,
    declineReturnBodyReasonMax as declineReasonMax,
    createReturnBodyNoteMax as returnNoteMax
} from '@api/schemas';
