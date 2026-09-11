/**
 * @module
 * Webhooks' validation messages follow the active locale. The MECHANISM — that a thunked Zod
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
import { webhookCreateSchema } from '@/modules/webhooks/schemas';
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

describe('webhooks schema messages', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it('resolves the url message in English, then in Italian, from the same schema object', () => {
        expect(messagesOf(webhookCreateSchema, { url: 'not-a-url', eventTypes: ['x'] })).toEqual(
            expect.arrayContaining([enMessages['webhooks-form']['url-invalid']])
        );

        return setLocale('it').then(() => {
            expect(
                messagesOf(webhookCreateSchema, { url: 'not-a-url', eventTypes: ['x'] })
            ).toEqual(expect.arrayContaining([itMessages['webhooks-form']['url-invalid']]));
        });
    });

    it('resolves the https-only message', () => {
        expect(
            messagesOf(webhookCreateSchema, { url: 'http://example.com', eventTypes: ['x'] })
        ).toEqual(expect.arrayContaining([enMessages['webhooks-form']['url-must-be-https']]));
    });

    it('resolves the event-types message', () =>
        setLocale('it').then(() => {
            expect(
                messagesOf(webhookCreateSchema, { url: 'https://example.com', eventTypes: [] })
            ).toEqual(
                expect.arrayContaining([itMessages['webhooks-form']['event-types-required']])
            );
        }));
});
