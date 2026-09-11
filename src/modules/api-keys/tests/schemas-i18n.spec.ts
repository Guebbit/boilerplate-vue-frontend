/**
 * @module
 * Api-keys' validation messages follow the active locale. The MECHANISM — that a thunked Zod
 * message re-resolves at parse time — is proven once elsewhere, with an invented schema, in
 * `tests/cross-cutting/schemas-i18n.spec.ts`; this file proves THIS module's schema and
 * dictionaries actually agree, so it lives with the domain (`docs/theory/modules.md`).
 *
 * Runs against the real vue-i18n instance, with the modules wired in as `src/main.ts` does: a
 * mocked `t` would assert only that a key was looked up, which stays true when the message is
 * frozen in the wrong language.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { loadLocale } from '@/infrastructure/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { apiKeyCreateSchema } from '@/modules/api-keys/schemas';
import enMessages from '../locales/en.json';
import itMessages from '../locales/it.json';

/**
 * Switches the active i18n locale and waits for the DOM-facing reactivity to settle.
 *
 * @param locale - Locale code to switch to.
 * @returns A promise resolving once the locale is active.
 */
const setLocale = (locale: string) => loadLocale(locale).then(() => nextTick());

/**
 * Every issue message a schema produces for a value, in the currently active locale.
 */
const messagesOf = (
    schema: { safeParse: (value: unknown) => { error?: { issues: { message: string }[] } } },
    value: unknown
) => schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

describe('api-keys schema messages', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it('resolves the required-name message in English, then in Italian, from the same schema object', () => {
        expect(
            messagesOf(apiKeyCreateSchema, { name: '', permissions: ['products.read'] })
        ).toEqual(expect.arrayContaining([enMessages['api-keys-form']['name-required']]));

        return setLocale('it').then(() => {
            expect(
                messagesOf(apiKeyCreateSchema, { name: '', permissions: ['products.read'] })
            ).toEqual(expect.arrayContaining([itMessages['api-keys-form']['name-required']]));
        });
    });

    it('resolves the too-long-name message', () => {
        expect(
            messagesOf(apiKeyCreateSchema, {
                name: 'x'.repeat(201),
                permissions: ['products.read']
            })
        ).toEqual(expect.arrayContaining([enMessages['api-keys-form']['name-too-long']]));
    });

    it('resolves the permissions-required message', () =>
        setLocale('it').then(() => {
            expect(messagesOf(apiKeyCreateSchema, { name: 'a key', permissions: [] })).toEqual(
                expect.arrayContaining([itMessages['api-keys-form']['permissions-required']])
            );
        }));

    it('resolves the past-expiry message', () => {
        expect(
            messagesOf(apiKeyCreateSchema, {
                name: 'a key',
                permissions: ['products.read'],
                expiresAt: new Date(Date.now() - 60_000).toISOString()
            })
        ).toEqual(expect.arrayContaining([enMessages['api-keys-form']['expires-at-past']]));
    });
});
