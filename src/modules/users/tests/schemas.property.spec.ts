/**
 * `src/modules/users/schemas.ts` against the contract's own `CreateUserBody`, by generated payloads.
 *
 * `schemas.spec.ts` pins the boundaries one by one. This asks the general question the contract
 * poses: does the form accept EVERY body the API accepts, and refuse each one the API refuses
 * because of a field the form validates? The payloads come from the generated Zod schema
 * (`tests/support/unit/contract-data.ts`), so a contract change moves this with it.
 *
 * Seed: `RANDOM_DATA_SEED` or a fresh value printed on first use; the count is `TEST_PROPERTY_RUNS`.
 */
import { describe, expect, it } from 'vitest';
import { CreateUserBody } from '@api/schemas';
import { invalidPayloads, validPayload } from '../../../../tests/support/unit/contract-data.ts';
import { PROPERTY_RUNS } from '../../../../tests/support/unit/knobs.ts';
import { usersSchema } from '../schemas';

/** The fields the user form validates itself; the rest it passes through unchecked. */
const VALIDATED_FIELDS = new Set(['email', 'username']);

describe('the user form against CreateUserBody', () => {
    it('accepts every body the contract accepts', () => {
        for (let run = 0; run < PROPERTY_RUNS; run += 1) {
            const body = validPayload(CreateUserBody);

            expect(usersSchema.safeParse(body).success).toBe(true);
        }
    });

    it('refuses each body the contract refuses because of a field the form validates', () => {
        // Each round draws a fresh valid base, so the broken field is the only difference.
        for (let run = 0; run < Math.min(PROPERTY_RUNS, 25); run += 1) {
            const cases = invalidPayloads(CreateUserBody).filter(({ field }) =>
                VALIDATED_FIELDS.has(field)
            );
            expect(cases.length).toBeGreaterThan(0);

            for (const { field, violation, payload } of cases)
                expect(usersSchema.safeParse(payload).success, `${field}: ${violation}`).toBe(
                    false
                );
        }
    });
});
