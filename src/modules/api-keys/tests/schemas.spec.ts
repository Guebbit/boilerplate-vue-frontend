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
    permissions: ['products.read'],
    expiresAt: new Date(Date.now() + 86_400_000).toISOString()
};

/** An ISO instant this many days from now. */
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

describe('apiKeyCreateSchema', () => {
    it('accepts a minimal valid credential', () => {
        expect(apiKeyCreateSchema.safeParse(validCredential).success).toBe(true);
    });

    it('requires an expiry: a credential that never expires is never rotated', () => {
        const { expiresAt: _omitted, ...withoutExpiry } = validCredential;

        expect(apiKeyCreateSchema.safeParse(withoutExpiry).success).toBe(false);
        expect(apiKeyCreateSchema.safeParse({ ...validCredential, expiresAt: '' }).success).toBe(
            false
        );
    });

    it('accepts an expiry a little under a year ahead and refuses one beyond it', () => {
        expect(
            apiKeyCreateSchema.safeParse({ ...validCredential, expiresAt: ahead(360) }).success
        ).toBe(true);
        expect(
            apiKeyCreateSchema.safeParse({ ...validCredential, expiresAt: ahead(370) }).success
        ).toBe(false);
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
