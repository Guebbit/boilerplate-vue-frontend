/**
 * @module
 * Zod validation schemas for the task forms, with i18n-thunked error messages resolved at
 * parse time. Length caps are the generated contract constants from `@api/schemas`.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { TaskCategory } from '@/types/enums.ts';
import {
    createContactTaskBodyNameMax,
    createContactTaskBodyEmailMax,
    createContactTaskBodySubjectMax,
    createContactTaskBodyMessageMax,
    createContactTaskBodyOrderNumberMax
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
 * The public contact form (`CreateContactTaskRequest`).
 */
export const contactSchema = z.object({
    name: cappedText(createContactTaskBodyNameMax).optional(),
    email: z
        .email({ error: () => translate('contact-page.email-invalid') })
        .max(createContactTaskBodyEmailMax, {
            error: () => translate('contact-page.too-long', { max: createContactTaskBodyEmailMax })
        }),
    subject: cappedText(createContactTaskBodySubjectMax).min(1, {
        error: () => translate('contact-page.subject-required')
    }),
    message: cappedText(createContactTaskBodyMessageMax).min(1, {
        error: () => translate('contact-page.message-required')
    }),
    category: z.enum(TaskCategory).optional(),
    orderNumber: cappedText(createContactTaskBodyOrderNumberMax).optional(),
    // Never shown to a visitor, so never validated — the BE decides what a filled value means;
    // this form only has to carry it through unedited.
    website: z.string().optional()
});

/**
 * The contract's order-number bound; the contact view reads it from here because a component
 * does not import `@api/schemas`.
 */
export { createContactTaskBodyOrderNumberMax as orderNumberMax } from '@api/schemas';
