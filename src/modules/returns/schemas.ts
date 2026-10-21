/**
 * @module
 * Zod field schemas for the returns forms, with i18n-thunked error messages resolved at parse time.
 * Length caps are the generated contract constants from `@api/schemas`; each form composes these
 * fields with its own reactive rules (the reason list, the picked lines).
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { createReturnBodyNoteMax, declineReturnBodyReasonMax } from '@api/schemas';

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
 * The buyer's optional note on a return request, within the create operation's cap.
 */
export const returnNoteSchema = z
    .string()
    .trim()
    .max(createReturnBodyNoteMax, {
        error: () =>
            translate('returns-request.error-note-too-long', { max: createReturnBodyNoteMax })
    });
