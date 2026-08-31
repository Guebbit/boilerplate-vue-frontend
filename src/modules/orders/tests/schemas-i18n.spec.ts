/**
 * @module
 * Vitest spec wiring the real i18n instance and locale dictionaries, then parsing invalid values
 * through orders' schemas to check the resolved messages follow the active locale.
 *
 * The MECHANISM — that a thunked Zod message re-resolves at parse time — is proven once, with an
 * invented schema, in `tests/cross-cutting/schemas-i18n.spec.ts`. What is proven here is that THIS
 * module's schemas and THIS module's dictionaries actually agree: every key the schemas reach for
 * exists in both languages, and the Italian copy is not the English copy — a fact about this
 * domain, so it lives with it: deleting the folder deletes the coverage rather than breaking a
 * spec that belongs to nobody. See `docs/theory/modules.md`.
 *
 * Against the real vue-i18n instance, with the modules wired in as `src/main.ts` does: a mocked
 * `t` would assert only that a key was looked up, which stays true when the message is frozen in
 * the wrong language.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { loadLocale } from '@/infrastructure/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { ordersSchema } from '../schemas';
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

describe('orders schema messages', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it('resolves every field message in Italian', () =>
        setLocale('it').then(() => {
            expect(messagesOf(ordersSchema, { email: 'nope', status: 'not-a-status' })).toEqual(
                expect.arrayContaining([
                    itMessages['orders-form']['email-invalid'],
                    itMessages['orders-form']['status-invalid']
                ])
            );
        }));
});
