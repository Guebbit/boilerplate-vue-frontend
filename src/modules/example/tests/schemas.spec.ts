/**
 * @module
 * The example form schemas: what a form refuses, with the bounds read from the generated
 * contract rather than restated, and the status limited to the closed set.
 */
import { describe, expect, it } from 'vitest';
import { exampleCreateSchema, exampleEditSchema } from '@/modules/example/schemas';
import { createExampleBodyBodyMax, createExampleBodyTitleMax } from '@api/schemas';

/** The fields a valid create carries. */
const VALID = { title: 'A title', body: 'A body' };

describe('exampleCreateSchema', () => {
    it('accepts a title and a body', () => {
        expect(exampleCreateSchema.safeParse(VALID).success).toBe(true);
    });

    it.each(['title', 'body'])('refuses an empty %s', (field) => {
        expect(exampleCreateSchema.safeParse({ ...VALID, [field]: '' }).success).toBe(false);
    });

    it('accepts a title exactly at the contract’s ceiling and refuses one over it', () => {
        const atCeiling = { ...VALID, title: 'x'.repeat(createExampleBodyTitleMax) };
        const over = { ...VALID, title: 'x'.repeat(createExampleBodyTitleMax + 1) };

        expect(exampleCreateSchema.safeParse(atCeiling).success).toBe(true);
        expect(exampleCreateSchema.safeParse(over).success).toBe(false);
    });

    it('accepts a body exactly at the contract’s ceiling and refuses one over it', () => {
        const atCeiling = { ...VALID, body: 'x'.repeat(createExampleBodyBodyMax) };
        const over = { ...VALID, body: 'x'.repeat(createExampleBodyBodyMax + 1) };

        expect(exampleCreateSchema.safeParse(atCeiling).success).toBe(true);
        expect(exampleCreateSchema.safeParse(over).success).toBe(false);
    });
});

describe('exampleEditSchema', () => {
    it.each(['draft', 'published', 'archived'])('accepts the status %s', (status) => {
        expect(exampleEditSchema.safeParse({ ...VALID, status }).success).toBe(true);
    });

    it('refuses a status outside the closed set', () => {
        expect(exampleEditSchema.safeParse({ ...VALID, status: 'deleted' }).success).toBe(false);
    });

    it('requires the status: an edit names the whole state', () => {
        expect(exampleEditSchema.safeParse(VALID).success).toBe(false);
    });
});
