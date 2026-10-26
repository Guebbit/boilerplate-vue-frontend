/**
 * @module
 * `src/modules/returns/schemas.ts` — the decline code and message, and the return note.
 *
 * The caps are read from `@api/schemas` rather than retyped, so a contract change moves the tests
 * with the form: one past the cap fails, exactly the cap passes.
 */
import { describe, expect, it } from 'vitest';
import { createReturnBodyNoteMax, declineReturnBodyMessageMax } from '@api/schemas';
import { declineMessageSchema, declineReasonSchema, returnNoteSchema } from '../schemas';

describe('declineReasonSchema', () => {
    it('takes only a listed code', () => {
        expect(declineReasonSchema.safeParse('').success).toBe(false);
        expect(declineReasonSchema.safeParse('Worn').success).toBe(false);
        for (const code of ['return_period_ended', 'not_returnable', 'no_defect_found', 'other'])
            expect(declineReasonSchema.safeParse(code).success).toBe(true);
    });
});

describe('declineMessageSchema', () => {
    it('allows an empty message and caps it at the contract maximum', () => {
        expect(declineMessageSchema.safeParse('').success).toBe(true);
        expect(
            declineMessageSchema.safeParse('a'.repeat(declineReturnBodyMessageMax)).success
        ).toBe(true);
        expect(
            declineMessageSchema.safeParse('a'.repeat(declineReturnBodyMessageMax + 1)).success
        ).toBe(false);
    });
});

describe('returnNoteSchema', () => {
    it('allows an empty note and caps it at the contract maximum', () => {
        expect(returnNoteSchema.safeParse('').success).toBe(true);
        expect(returnNoteSchema.safeParse('a'.repeat(createReturnBodyNoteMax)).success).toBe(true);
        expect(returnNoteSchema.safeParse('a'.repeat(createReturnBodyNoteMax + 1)).success).toBe(
            false
        );
    });
});
