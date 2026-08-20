import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import * as z from 'zod';
import { useStructureFormValidation } from '@guebbit/vue-toolkit';
import { i18n, loadLocale, registerLocaleContributors, translate } from '@/infrastructure/i18n';

/**
 * That a Zod schema follows the active locale — the MECHANISM, with an invented schema.
 *
 * The property under test: ONE schema object, parsed twice, in two languages, with nothing rebuilt
 * in between. It works because every message is a THUNK — `{ error: () => translate('…') }`, never
 * `{ error: translate('…') }` — and Zod v4 calls it at PARSE time.
 *
 * Deliberately against the real vue-i18n instance from `@/infrastructure/i18n` — no `vi.mock`. A mocked
 * `t` would assert only that a key was looked up, which is true even when the message is frozen in
 * the wrong language.
 *
 * ── Why the schema is invented ───────────────────────────────────────────────────────────────
 * Importing `usersSchema`, `productsSchema` and `ordersSchema` here would make a spec belonging
 * to no domain break when any one of those domains is deleted — the coupling
 * `docs/theory/modules.md` describes. The mechanism is domain-agnostic, so it is tested with a
 * domain-agnostic schema and a synthetic dictionary.
 *
 * Each module proves its OWN messages resolve in both languages, in
 * `src/modules/<name>/tests/schemas-i18n.spec.ts`, where deleting the folder deletes the coverage.
 */

const EN = 'Not an email';
const IT = 'Non è un indirizzo email';

/*
 * A synthetic contributor standing in for whatever modules this build enables. Registered instead
 * of `wireModulesIntoCore()` precisely so that no real domain's vocabulary is involved.
 */
registerLocaleContributors({
    en: [() => Promise.resolve({ madeUpForm: { emailInvalid: EN } })],
    it: [() => Promise.resolve({ madeUpForm: { emailInvalid: IT } })]
});

/** The shape every domain schema in this codebase has: a thunk per message. */
const madeUpSchema = z.object({
    email: z.email({ error: () => translate('madeUpForm.emailInvalid') })
});

const setLocale = (locale: string) => loadLocale(locale).then(() => nextTick());

/**
 * Every issue message a schema produces for a value, in the currently active locale.
 */
const messagesOf = (
    schema: { safeParse: (value: unknown) => { error?: { issues: { message: string }[] } } },
    value: unknown
) => schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

describe('a thunked schema follows the active locale', () => {
    beforeAll(() => setLocale('en'));
    afterEach(() => setLocale('en'));

    it('resolves in English, then in Italian, from the same schema object', () => {
        expect(messagesOf(madeUpSchema, { email: 'nope' })).toEqual([EN]);

        return setLocale('it').then(() => {
            expect(messagesOf(madeUpSchema, { email: 'nope' })).toEqual([IT]);
        });
    });
});

/**
 * The half a thunk cannot fix.
 *
 * `validate()` copies RESOLVED STRINGS into `formErrors`; after it returns, the schema is out of
 * the picture and re-rendering just re-prints the same text. Only re-running `validate()` can
 * re-translate what is already on screen, which is what `revalidateOn` does.
 *
 * A harness component rather than a full view: real schema, real composable, real i18n, real
 * rendering, and no six mocks in the way. `src/modules/account/tests/login-view-i18n.spec.ts`
 * covers the wiring in an actual view.
 */
const createHarness = (options: Parameters<typeof useStructureFormValidation>[2] = {}) =>
    defineComponent({
        setup() {
            const { form, formErrors, validate } = useStructureFormValidation<{ email?: string }>(
                { email: '' },
                madeUpSchema,
                options
            );
            return { form, formErrors, validate };
        },
        render() {
            return h('p', { class: 'error' }, (this.formErrors.email ?? []).join(''));
        }
    });

describe('displayed errors and a locale switch', () => {
    beforeAll(() => setLocale('en'));
    afterEach(() => setLocale('en'));

    it('re-translates an error already on screen when revalidateOn is wired', () => {
        const wrapper = mount(createHarness({ revalidateOn: i18n.global.locale }), {
            global: { plugins: [i18n] }
        });

        wrapper.vm.validate();
        return nextTick()
            .then(() => {
                expect(wrapper.get('.error').text()).toBe(EN);
                return setLocale('it');
            })
            .then(() => {
                expect(wrapper.get('.error').text()).toBe(IT);
            });
    });

    it('leaves a form that was never validated untouched', () => {
        const wrapper = mount(createHarness({ revalidateOn: i18n.global.locale }), {
            global: { plugins: [i18n] }
        });

        return setLocale('it').then(() => {
            expect(wrapper.get('.error').text()).toBe('');
        });
    });

    /**
     * Pins the staleness this exists to fix: without `revalidateOn` the error stays English under
     * an Italian UI. If a future change makes this pass, `revalidateOn` has become redundant and
     * the option — not this test — is what should go.
     */
    it('goes stale without revalidateOn, which is the whole reason the option exists', () => {
        const wrapper = mount(createHarness(), { global: { plugins: [i18n] } });

        wrapper.vm.validate();
        return nextTick()
            .then(() => setLocale('it'))
            .then(() => {
                expect(wrapper.get('.error').text()).toBe(EN);
            });
    });
});
