/**
 * @module
 * The example form schema: what the create and the edit form refuse, with the bounds read from the
 * generated contract rather than restated. The status is not a form field: it has its own door.
 */
import { describe, expect, it } from 'vitest';
import { exampleFormSchema } from '../schemas';
import { createExampleBodyBodyMax, createExampleBodyTitleMax } from '@api/schemas';

/** The fields a valid submission carries. */
const VALID = { title: 'A title', body: 'A body' };

describe('exampleFormSchema', () => {
    it('ignores a status: the form does not carry one', () => {
        expect(exampleFormSchema.parse({ ...VALID, status: 'published' })).toEqual(VALID);
    });

    it('accepts a title and a body', () => {
        expect(exampleFormSchema.safeParse(VALID).success).toBe(true);
    });

    it.each(['title', 'body'])('refuses an empty %s', (field) => {
        expect(exampleFormSchema.safeParse({ ...VALID, [field]: '' }).success).toBe(false);
    });

    it('accepts a title exactly at the contract’s ceiling and refuses one over it', () => {
        const atCeiling = { ...VALID, title: 'x'.repeat(createExampleBodyTitleMax) };
        const over = { ...VALID, title: 'x'.repeat(createExampleBodyTitleMax + 1) };

        expect(exampleFormSchema.safeParse(atCeiling).success).toBe(true);
        expect(exampleFormSchema.safeParse(over).success).toBe(false);
    });

    it('accepts a body exactly at the contract’s ceiling and refuses one over it', () => {
        const atCeiling = { ...VALID, body: 'x'.repeat(createExampleBodyBodyMax) };
        const over = { ...VALID, body: 'x'.repeat(createExampleBodyBodyMax + 1) };

        expect(exampleFormSchema.safeParse(atCeiling).success).toBe(true);
        expect(exampleFormSchema.safeParse(over).success).toBe(false);
    });
});
