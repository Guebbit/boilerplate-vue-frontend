/**
 * `scripts/e2e/contract-mismatch.ts` — the predicate behind the Cypress `[contract]` hook.
 *
 * A false positive fails an innocent test; a false negative lets drift through silently.
 */
import { describe, expect, it } from 'vitest';
import { isContractMismatch } from '../../../../scripts/e2e/contract-mismatch';

/** The diagnostic `validate.ts` logs, field list included. */
const DIAGNOSTIC =
    '[contract] response for GET /account does not match the OpenAPI schema:\n  - id: Required';

describe('isContractMismatch', () => {
    it('matches the contract diagnostic logged through console.error', () => {
        expect(isContractMismatch('error', [DIAGNOSTIC])).toBe(true);
    });

    it('ignores the same text through console.warn', () => {
        expect(isContractMismatch('warn', [DIAGNOSTIC])).toBe(false);
    });

    it('ignores an unrelated console.error', () => {
        expect(isContractMismatch('error', ['TypeError: x is undefined'])).toBe(false);
    });

    it('ignores a [contract] line that does not say it does not match', () => {
        expect(
            isContractMismatch('error', [
                '[contract] no response schema mapped for GET /x — skipping validation'
            ])
        ).toBe(false);
    });

    it('ignores a call whose first argument is not a string', () => {
        expect(isContractMismatch('error', [new Error(DIAGNOSTIC)])).toBe(false);
        expect(isContractMismatch('error', [])).toBe(false);
    });
});
