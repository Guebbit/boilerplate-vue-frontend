/**
 * @module
 * Zod field schemas for the returns forms, with i18n-thunked error messages resolved at parse time.
 * Length caps are the generated contract constants from `@api/schemas`; each form composes these
 * fields with its own reactive rules (the reason list, the picked lines).
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { ReturnDeclineReason } from '@/types/enums.ts';
import {
    cancelReturnBodyNoteMax,
    closeReturnBodyNoteMax,
    createReturnBodyNoteMax,
    declineReturnBodyMessageMax
} from '@api/schemas';

/**
 * The codes a decline can carry, in the order the select lists them.
 */
export const DECLINE_REASONS = Object.values(ReturnDeclineReason);

/**
 * {@link DECLINE_REASONS} as plain strings, so a select's value can be looked up.
 */
const DECLINE_REASON_NAMES: ReadonlySet<string> = new Set(DECLINE_REASONS);

/**
 * The decline code: a required pick from the list, never typed.
 */
export const declineReasonSchema = z.string().refine((value) => DECLINE_REASON_NAMES.has(value), {
    error: () => translate('return-staff-actions.error-reason-required')
});

/**
 * Staff's message to the buyer, within the decline operation's cap. Empty is fine unless the code
 * is `other`: the form adds that rule, since it depends on the other field.
 */
export const declineMessageSchema = z
    .string()
    .trim()
    .max(declineReturnBodyMessageMax, {
        error: () =>
            translate('return-staff-actions.error-reason-too-long', {
                max: declineReturnBodyMessageMax
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
 * Staff's optional note when canceling an approved return, within the cancel operation's cap. Empty
 * is fine: the audit row only keeps a note when there is one.
 */
export const cancelNoteSchema = z
    .string()
    .trim()
    .max(cancelReturnBodyNoteMax, {
        error: () =>
            translate('return-staff-actions.error-note-too-long', {
                max: cancelReturnBodyNoteMax
            })
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
    cancelReturnBodyNoteMax as cancelNoteMax,
    closeReturnBodyNoteMax as closeNoteMax,
    declineReturnBodyMessageMax as declineMessageMax,
    createReturnBodyNoteMax as returnNoteMax
} from '@api/schemas';
