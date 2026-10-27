/**
 * @module
 * Zod validation schemas for the ticket forms, with i18n-thunked error messages resolved at
 * parse time. Length caps are the generated contract constants from `@api/schemas`.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { TicketCategory } from '@/types/enums.ts';
import {
    createContactTicketBodyNameMax,
    createContactTicketBodyEmailMax,
    createContactTicketBodySubjectMax,
    createContactTicketBodyMessageMax,
    createContactTicketBodyOrderNumberMax
} from '@api/schemas';

/**
 * A string capped at a contract length, with the cap named in the message.
 *
 * @param max - The contract's `maxLength`.
 * @returns The schema.
 */
const cappedText = (max: number) =>
    z.string().max(max, { error: () => translate('contact-page.too-long', { max }) });

/**
 * The public contact form (`CreateContactTicketRequest`).
 */
export const contactSchema = z.object({
    name: cappedText(createContactTicketBodyNameMax).optional(),
    email: z
        .email({ error: () => translate('contact-page.email-invalid') })
        .max(createContactTicketBodyEmailMax, {
            error: () =>
                translate('contact-page.too-long', { max: createContactTicketBodyEmailMax })
        }),
    subject: cappedText(createContactTicketBodySubjectMax).min(1, {
        error: () => translate('contact-page.subject-required')
    }),
    message: cappedText(createContactTicketBodyMessageMax).min(1, {
        error: () => translate('contact-page.message-required')
    }),
    category: z.enum(TicketCategory).optional(),
    orderNumber: cappedText(createContactTicketBodyOrderNumberMax).optional(),
    // Never shown to a visitor, so never validated — the BE decides what a filled value means;
    // this form only has to carry it through unedited.
    website: z.string().optional()
});

/**
 * The contract's order-number bound; the contact view reads it from here because a component
 * does not import `@api/schemas`.
 */
export { createContactTicketBodyOrderNumberMax as orderNumberMax } from '@api/schemas';
