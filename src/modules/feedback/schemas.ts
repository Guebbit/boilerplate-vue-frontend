/**
 * @module
 * Zod validation schemas for the feedback forms, with i18n-thunked error messages resolved at
 * parse time. Length caps are the generated contract constants from `@api/schemas`.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { FeedbackCategory } from '@/types/enums.ts';
import {
    createFeedbackRequestBodyNameMax,
    createFeedbackRequestBodyEmailMax,
    createFeedbackRequestBodySubjectMax,
    createFeedbackRequestBodyMessageMax,
    createFeedbackRequestBodyOrderNumberMax
} from '@api/schemas';

/**
 * The shortest message the contact form accepts: a nudge toward a message the shop can act on.
 * Stricter than the contract, which only asks for one character.
 */
const CONTACT_MESSAGE_MIN = 10;

/**
 * A string capped at a contract length, with the cap named in the message.
 *
 * @param max - The contract's `maxLength`.
 * @returns The schema.
 */
const cappedText = (max: number) =>
    z.string().max(max, { error: () => translate('contact-page.too-long', { max }) });

/**
 * The public contact form (`CreateFeedbackRequest`).
 */
export const contactSchema = z.object({
    name: cappedText(createFeedbackRequestBodyNameMax).optional(),
    email: z
        .email({ error: () => translate('contact-page.email-invalid') })
        .max(createFeedbackRequestBodyEmailMax, {
            error: () =>
                translate('contact-page.too-long', { max: createFeedbackRequestBodyEmailMax })
        }),
    subject: cappedText(createFeedbackRequestBodySubjectMax).min(1, {
        error: () => translate('contact-page.subject-required')
    }),
    message: cappedText(createFeedbackRequestBodyMessageMax).min(CONTACT_MESSAGE_MIN, {
        error: () => translate('contact-page.message-min')
    }),
    category: z.enum(FeedbackCategory).optional(),
    orderNumber: cappedText(createFeedbackRequestBodyOrderNumberMax).optional(),
    // Never shown to a visitor, so never validated — the BE decides what a filled value means;
    // this form only has to carry it through unedited.
    website: z.string().optional()
});
