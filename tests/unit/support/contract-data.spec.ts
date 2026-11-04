/**
 * `tests/support/unit/contract-data.ts`: the Zod-driven payload generator.
 *
 * Pinned against small schemas written here, so a failure is the generator's and not a contract change.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { invalidPayloads, validPayload } from '../../support/unit/contract-data.ts';

/** Enough draws that a 4-way random pick almost certainly hits every email shape. */
const SAMPLE_COUNT = 200;

/** A body with a bounded string, a bounded number, an enum and a defaulted flag. */
const body = z.strictObject({
    name: z.string().min(3).max(8),
    count: z.number().min(1).max(5),
    kind: z.enum(['a', 'b']),
    active: z.boolean().default(true),
    note: z.string().optional()
});

describe('validPayload', () => {
    it('never emits a value its own schema rejects', () => {
        for (let run = 0; run < SAMPLE_COUNT; run += 1)
            expect(body.safeParse(validPayload(body)).success).toBe(true);
    });

    it('rotates through the awkward email shapes: plus-tag, long TLD, subdomain', () => {
        const schema = z.object({ email: z.email() });
        const emails = Array.from(
            { length: SAMPLE_COUNT },
            () => validPayload<{ email: string }>(schema).email
        );

        expect(emails.some((email) => email.includes('+'))).toBe(true);
        expect(emails.some((email) => /@[^.]+\.[a-z]{8,}$/.test(email))).toBe(true);
        expect(emails.some((email) => /@(?:[^.]+\.){2}[a-z]+$/.test(email))).toBe(true);
    });

    it('refuses a pattern it has no known-good sample for, rather than emit an illegal value', () => {
        const schema = z.object({ code: z.string().regex(/^zz-\d{3}$/) });

        expect(() => validPayload(schema)).toThrow('no sample value for pattern');
    });
});

describe('invalidPayloads', () => {
    it('breaks exactly one field per case, and the schema refuses every one', () => {
        const cases = invalidPayloads(body);

        expect(cases.length).toBeGreaterThan(0);
        for (const { field, violation, payload } of cases)
            expect(body.safeParse(payload).success, `${field}: ${violation}`).toBe(false);
    });

    it('does not call an omitted field "missing" when the schema optional or defaulted it', () => {
        const missing = invalidPayloads(body)
            .filter(({ violation }) => violation === 'missing required field')
            .map(({ field }) => field);

        expect(missing.toSorted()).toEqual(['count', 'kind', 'name']);
    });

    it('walks a union branch by branch', () => {
        const union = z.union([
            z.strictObject({ a: z.string().min(2) }),
            z.strictObject({ b: z.number().min(1) })
        ]);

        expect(new Set(invalidPayloads(union).map(({ field }) => field))).toEqual(
            new Set(['a', 'b'])
        );
    });
});
