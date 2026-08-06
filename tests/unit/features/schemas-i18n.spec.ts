import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useStructureFormValidation } from '@guebbit/vue-toolkit';
import { i18n, loadLocale } from '@/utils/i18n.ts';
import { usersSchema, usersPasswordSchema } from '@/features/users/schemas.ts';
import { productsSchema } from '@/features/products/schemas.ts';
import { orderSchema } from '@/features/orders/schemas.ts';
import enMessages from '@/locales/en.json';
import itMessages from '@/locales/it.json';

/**
 * The property the thunks buy, and the factories did not: ONE schema object, parsed twice, in two
 * languages, with nothing rebuilt in between.
 *
 * Deliberately against the real vue-i18n instance from `@/utils/i18n.ts` — no `vi.mock`. A mocked
 * `t` would assert that a key was looked up, which is the thing that was already true and still
 * shipped the bug.
 */
const setLocale = async (locale: string) => {
    await loadLocale(locale);
    await nextTick();
};

/**
 * Every issue message a schema produces for a value, in the currently active locale.
 */
const messagesOf = (
    schema: { safeParse: (value: unknown) => { error?: { issues: { message: string }[] } } },
    value: unknown
) => schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

describe('feature schemas follow the active locale', () => {
    beforeAll(() => setLocale('en'));
    afterEach(() => setLocale('en'));

    it('resolves user messages in English, then in Italian, from the same schema object', async () => {
        expect(messagesOf(usersSchema, { email: 'nope', username: 'a' })).toEqual(
            expect.arrayContaining([enMessages['users-form']['email-invalid']])
        );

        await setLocale('it');

        expect(messagesOf(usersSchema, { email: 'nope', username: 'a' })).toEqual(
            expect.arrayContaining([itMessages['users-form']['email-invalid']])
        );
    });

    it('does the same for every password rule, including the refinements', async () => {
        await setLocale('it');

        const messages = messagesOf(usersPasswordSchema, 'short');

        expect(messages).toEqual(
            expect.arrayContaining([
                itMessages['users-form']['password-min'],
                itMessages['users-form']['password-maius-required'],
                itMessages['users-form']['password-number-required'],
                itMessages['users-form']['password-special-required']
            ])
        );
    });

    it('does the same for products', async () => {
        expect(messagesOf(productsSchema, { title: '', price: -1 })).toEqual(
            expect.arrayContaining([enMessages['products-form']['title-required']])
        );

        await setLocale('it');

        expect(messagesOf(productsSchema, { title: '', price: -1 })).toEqual(
            expect.arrayContaining([itMessages['products-form']['title-required']])
        );
    });

    it('does the same for orders', async () => {
        await setLocale('it');

        expect(messagesOf(orderSchema, { email: 'nope', status: 'not-a-status' })).toEqual(
            expect.arrayContaining([
                itMessages['orders-form']['email-invalid'],
                itMessages['orders-form']['status-invalid']
            ])
        );
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
 * rendering, and no six mocks in the way. `tests/unit/features/login-view-i18n.spec.ts` covers
 * the wiring in an actual view.
 */
const createHarness = (options: Parameters<typeof useStructureFormValidation>[2] = {}) =>
    defineComponent({
        setup() {
            const { form, formErrors, validate } = useStructureFormValidation<{ email?: string }>(
                { email: '' },
                usersSchema.pick({ email: true }),
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

    it('re-translates an error already on screen when revalidateOn is wired', async () => {
        const wrapper = mount(createHarness({ revalidateOn: i18n.global.locale }), {
            global: { plugins: [i18n] }
        });

        wrapper.vm.validate();
        await nextTick();
        expect(wrapper.get('.error').text()).toBe(enMessages['users-form']['email-invalid']);

        await setLocale('it');

        expect(wrapper.get('.error').text()).toBe(itMessages['users-form']['email-invalid']);
    });

    it('leaves a form that was never validated untouched', async () => {
        const wrapper = mount(createHarness({ revalidateOn: i18n.global.locale }), {
            global: { plugins: [i18n] }
        });

        await setLocale('it');

        expect(wrapper.get('.error').text()).toBe('');
    });

    /**
     * Pins the staleness this exists to fix: without `revalidateOn` the error stays English under
     * an Italian UI. If a future change makes this pass, `revalidateOn` has become redundant and
     * the option — not this test — is what should go.
     */
    it('goes stale without revalidateOn, which is the whole reason the option exists', async () => {
        const wrapper = mount(createHarness(), { global: { plugins: [i18n] } });

        wrapper.vm.validate();
        await nextTick();

        await setLocale('it');

        expect(wrapper.get('.error').text()).toBe(enMessages['users-form']['email-invalid']);
    });
});
