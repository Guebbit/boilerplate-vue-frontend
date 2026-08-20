/**
 * Products' validation messages follow the active locale.
 *
 * The MECHANISM — that a thunked Zod message re-resolves at parse time — is proven once, with an
 * invented schema, in `tests/cross-cutting/schemas-i18n.spec.ts`. What is proven here is that THIS
 * module's schemas and THIS module's dictionaries actually agree: every key the schemas reach for
 * exists in both languages, and the Italian copy is not the English copy.
 *
 * That is a fact about this domain, so it lives with it — deleting the folder deletes the coverage
 * rather than breaking a spec that belongs to nobody. See `docs/theory/modules.md`.
 *
 * Against the real vue-i18n instance, with the modules wired in as `src/main.ts` does: a mocked
 * `t` would assert only that a key was looked up, which stays true when the message is frozen in
 * the wrong language.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { loadLocale } from '@/infrastructure/i18n';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { productsSchema } from '@/modules/products/schemas.ts';
import enMessages from '../locales/en.json';
import itMessages from '../locales/it.json';

const setLocale = (locale: string) => loadLocale(locale).then(() => nextTick());

/** Every issue message a schema produces for a value, in the currently active locale. */
const messagesOf = (
    schema: { safeParse: (value: unknown) => { error?: { issues: { message: string }[] } } },
    value: unknown
) => schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

describe('products schema messages', () => {
    beforeAll(() => {
        wireModulesIntoCore();
        return setLocale('en');
    });
    afterEach(() => setLocale('en'));

    it('resolves in English, then in Italian, from the same schema object', () => {
        expect(messagesOf(productsSchema, { title: '', price: -1 })).toEqual(
            expect.arrayContaining([enMessages['products-form']['title-required']])
        );

        return setLocale('it').then(() => {
            expect(messagesOf(productsSchema, { title: '', price: -1 })).toEqual(
                expect.arrayContaining([itMessages['products-form']['title-required']])
            );
        });
    });
});
