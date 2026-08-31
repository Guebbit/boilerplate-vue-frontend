/**
 * @module
 * Users' validation messages follow the active locale. The MECHANISM — that a thunked Zod message
 * re-resolves at parse time — is proven once elsewhere, with an invented schema, in
 * `tests/cross-cutting/schemas-i18n.spec.ts`; this file proves THIS module's schemas and
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
import { usersSchema, usersPasswordSchema } from '@/modules/users';
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

describe('users schema messages', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it('resolves in English, then in Italian, from the same schema object', () => {
        expect(messagesOf(usersSchema, { email: 'nope', username: 'a' })).toEqual(
            expect.arrayContaining([enMessages['users-form']['email-invalid']])
        );

        return setLocale('it').then(() => {
            expect(messagesOf(usersSchema, { email: 'nope', username: 'a' })).toEqual(
                expect.arrayContaining([itMessages['users-form']['email-invalid']])
            );
        });
    });

    it('does the same for every password rule, including the refinements', () =>
        setLocale('it').then(() => {
            expect(messagesOf(usersPasswordSchema, 'short')).toEqual(
                expect.arrayContaining([
                    itMessages['users-form']['password-min'],
                    itMessages['users-form']['password-maius-required'],
                    itMessages['users-form']['password-number-required'],
                    itMessages['users-form']['password-special-required']
                ])
            );
        }));
});
