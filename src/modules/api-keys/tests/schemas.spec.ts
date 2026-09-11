/**
 * @module
 * `src/modules/api-keys/schemas.ts` — the mint form's name/permissions/expiry rules. The
 * messages themselves belong to `schemas-i18n.spec.ts`; these are the rules.
 */
import { describe, expect, it } from 'vitest';
import { apiKeyCreateSchema } from '@/modules/api-keys/schemas';

/** A form payload that passes, for tests that vary one field away from valid. */
const validCredential = {
    name: 'CI integration',
    permissions: ['products.read']
};

describe('apiKeyCreateSchema', () => {
    it('accepts a minimal valid credential', () => {
        expect(apiKeyCreateSchema.safeParse(validCredential).success).toBe(true);
    });

    it('accepts an optional future expiry', () => {
        expect(
            apiKeyCreateSchema.safeParse({
                ...validCredential,
                expiresAt: new Date(Date.now() + 86_400_000).toISOString()
            }).success
        ).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(apiKeyCreateSchema.safeParse({ ...validCredential, name: '' }).success).toBe(false);
    });

    it('rejects a name past the contract-declared maximum', () => {
        expect(
            apiKeyCreateSchema.safeParse({ ...validCredential, name: 'x'.repeat(201) }).success
        ).toBe(false);
    });

    it('accepts a name exactly at the maximum', () => {
        expect(
            apiKeyCreateSchema.safeParse({ ...validCredential, name: 'x'.repeat(200) }).success
        ).toBe(true);
    });

    it('rejects an empty permissions array', () => {
        expect(apiKeyCreateSchema.safeParse({ ...validCredential, permissions: [] }).success).toBe(
            false
        );
    });

    it('accepts more than one permission', () => {
        expect(
            apiKeyCreateSchema.safeParse({
                ...validCredential,
                permissions: ['products.read', 'orders.read']
            }).success
        ).toBe(true);
    });

    it('rejects an expiry already in the past', () => {
        expect(
            apiKeyCreateSchema.safeParse({
                ...validCredential,
                expiresAt: new Date(Date.now() - 60_000).toISOString()
            }).success
        ).toBe(false);
    });
});
