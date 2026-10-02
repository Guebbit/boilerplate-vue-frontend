/**
 * @module
 * The example form's validation messages follow the active locale. The MECHANISM, that a thunked
 * Zod message re-resolves at parse time, is proven once in `tests/cross-cutting/schemas-i18n.spec.ts`;
 * this file proves THIS module's schema and dictionaries agree, so it lives with the domain.
 *
 * Runs against the real vue-i18n instance, with the modules wired in as `src/main.ts` does: a
 * mocked `t` would assert only that a key was looked up, which stays true when the message is
 * frozen in the wrong language.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { loadLocale } from '@/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { exampleCreateSchema } from '@/modules/example/schemas';
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
 * Every issue message the create schema produces for an empty title, in the active locale.
 */
const messagesForEmptyTitle = () =>
    exampleCreateSchema
        .safeParse({ title: '', body: 'A body' })
        .error?.issues.map(({ message }) => message) ?? [];

describe('example schema messages', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it('resolves the required-title message in English, then in Italian, from the same schema object', () => {
        expect(messagesForEmptyTitle()).toEqual(
            expect.arrayContaining([enMessages['example-form']['title-required']])
        );

        return setLocale('it').then(() => {
            expect(messagesForEmptyTitle()).toEqual(
                expect.arrayContaining([itMessages['example-form']['title-required']])
            );
        });
    });
});
