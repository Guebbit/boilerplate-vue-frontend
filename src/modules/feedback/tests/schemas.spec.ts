/**
 * @module
 * `src/modules/feedback/schemas.ts` — the public contact form.
 *
 * The caps are read from `@api/schemas` rather than retyped, so a contract change moves the tests
 * with the form: one past the cap fails, exactly the cap passes.
 */
import { describe, expect, it } from 'vitest';
import {
    createFeedbackRequestBodyMessageMax,
    createFeedbackRequestBodyNameMax,
    createFeedbackRequestBodyOrderNumberMax,
    createFeedbackRequestBodySubjectMax
} from '@api/schemas';
import { contactSchema } from '../schemas';

/** A message that passes, for tests that vary one field away from valid. */
const validMessage = {
    email: 'a@example.com',
    subject: 'Hello',
    message: 'A message long enough to send.'
};

describe('contactSchema', () => {
    it('accepts a minimal valid message', () => {
        expect(contactSchema.safeParse(validMessage).success).toBe(true);
    });

    it.each([
        ['name', createFeedbackRequestBodyNameMax],
        ['subject', createFeedbackRequestBodySubjectMax],
        ['message', createFeedbackRequestBodyMessageMax],
        ['orderNumber', createFeedbackRequestBodyOrderNumberMax]
    ])('caps %s at the contract maximum', (field, max) => {
        const parse = (value: string) =>
            contactSchema.safeParse({ ...validMessage, [field]: value }).success;
        expect(parse('a'.repeat(max))).toBe(true);
        expect(parse('a'.repeat(max + 1))).toBe(false);
    });

    it('accepts a one-character message, as the contract does', () => {
        expect(contactSchema.safeParse({ ...validMessage, message: '?' }).success).toBe(true);
    });

    it('rejects an empty message with the required-message key', () => {
        const result = contactSchema.safeParse({ ...validMessage, message: '' });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe('contact-page.message-required');
    });
});
