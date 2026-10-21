/**
 * @module
 * `src/modules/returns/schemas.ts` — the decline reason and the return note.
 *
 * The caps are read from `@api/schemas` rather than retyped, so a contract change moves the tests
 * with the form: one past the cap fails, exactly the cap passes.
 */
import { describe, expect, it } from 'vitest';
import { createReturnBodyNoteMax, declineReturnBodyReasonMax } from '@api/schemas';
import { declineReasonSchema, returnNoteSchema } from '../schemas';

describe('declineReasonSchema', () => {
    it('requires a reason and caps it at the contract maximum', () => {
        expect(declineReasonSchema.safeParse('  ').success).toBe(false);
        expect(declineReasonSchema.safeParse('a'.repeat(declineReturnBodyReasonMax)).success).toBe(
            true
        );
        expect(
            declineReasonSchema.safeParse('a'.repeat(declineReturnBodyReasonMax + 1)).success
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
