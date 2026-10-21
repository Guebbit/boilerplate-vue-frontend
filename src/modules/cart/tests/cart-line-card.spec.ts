/**
 * `CartLineCard.vue` — one line of either cart. The card holds no rule: the spec pins that the
 * flags it is given disable the right buttons, that a move leaves as an event with its delta, that
 * the hooks follow the prefix, and that no price renders before one is known.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CartLineCard from '../components/CartLineCard.vue';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/i18n';

beforeAll(() => loadLocale('en'));

/** Mounts the card; `props` override the defaults. */
const mountCard = (props: Record<string, unknown> = {}, badges = '') =>
    mount(CartLineCard, {
        props: {
            title: 'Shirt',
            quantity: 2,
            unitPrice: 10,
            currency: 'EUR',
            canDecrease: true,
            canIncrease: true,
            testPrefix: 'cart',
            ...props
        },
        slots: badges ? { badges } : {},
        global: { plugins: [vuetify, i18n] }
    });

describe('CartLineCard', () => {
    it('builds every test hook from the prefix', () => {
        const wrapper = mountCard({ testPrefix: 'guest-cart' });

        for (const hook of ['item', 'decrease', 'increase', 'remove', 'line-price'])
            expect(wrapper.find(`[data-test=guest-cart-${hook}]`).exists()).toBe(true);
    });

    it('disables each stepper from its own flag', () => {
        const wrapper = mountCard({ canDecrease: false, canIncrease: true });

        expect(wrapper.get('[data-test=cart-decrease]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test=cart-increase]').attributes('disabled')).toBeUndefined();
    });

    it('emits the step with its delta, and remove', () => {
        const wrapper = mountCard();

        return wrapper
            .get('[data-test=cart-decrease]')
            .trigger('click')
            .then(() => wrapper.get('[data-test=cart-increase]').trigger('click'))
            .then(() => wrapper.get('[data-test=cart-remove]').trigger('click'))
            .then(() => {
                expect(wrapper.emitted('step')).toEqual([[-1], [1]]);
                expect(wrapper.emitted('remove')).toHaveLength(1);
            });
    });

    it('prints the priced line only once a price is known', () => {
        expect(mountCard().get('[data-test=cart-line-price]').text()).toContain('×');
        expect(
            mountCard({ unitPrice: undefined }).find('[data-test=cart-line-price]').exists()
        ).toBe(false);
    });

    it('renders the badges slot beside the quantity', () => {
        const wrapper = mountCard({}, '<span data-test="badge" />');

        expect(wrapper.get('[role=status]').find('[data-test=badge]').exists()).toBe(true);
    });
});
