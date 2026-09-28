/**
 * @module
 * Mounts the real search component and spies on the store's own read, the same pattern
 * `record-offline-payment-form.spec.ts` uses: the field state and this component's job stop at
 * EMITTING the found order — `payments` declares no `MODULE_EDGES` reach into `orders` (FA86), so
 * navigating to `OrderEdit` is the host's job, proven separately in `orders-list-view.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OrderReferenceSearch from '@/modules/payments/components/OrderReferenceSearch.vue';
import { usePaymentsStore } from '@/modules/payments/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import type { Order } from '@types';

const anOrder = (id: string): Order => ({
    id,
    userId: 'user-1',
    email: 'shopper@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 0,
    netTotal: 0,
    taxTotal: 0,
    shippingNetAmount: 0,
    shippingTaxAmount: 0,
    taxSummary: [],
    status: 'pending'
});

const mountSearch = () =>
    mount(OrderReferenceSearch, {
        global: { plugins: [vuetify, i18n] }
    });

/**
 * Waits until the inline message renders — the eventual condition every refusal case has.
 *
 * @param wrapper - The mounted search.
 * @returns Resolves once the message is in the DOM.
 */
const inlineMessage = (wrapper: ReturnType<typeof mountSearch>) =>
    vi.waitFor(() => wrapper.get('[data-test=order-reference-search-error]'));

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('OrderReferenceSearch', () => {
    it('emits the found order and clears the field, navigating nowhere itself', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'findOrderByReference').mockResolvedValue(anOrder('order-1'));
        const wrapper = mountSearch();

        return wrapper
            .get('[data-test=order-reference-search-input] input')
            .setValue('RF13 2EY8 H44V JAVZ KX80 JRL')
            .then(() => wrapper.get('[data-test=order-reference-search-submit]').trigger('click'))
            .then(() => vi.waitFor(() => expect(wrapper.emitted('found')).toBeDefined()))
            .then(() => {
                expect(payments.findOrderByReference).toHaveBeenCalledWith(
                    'RF13 2EY8 H44V JAVZ KX80 JRL'
                );
                expect(wrapper.emitted('found')).toEqual([[anOrder('order-1')]]);
                expect(
                    wrapper.get<HTMLInputElement>('[data-test=order-reference-search-input] input')
                        .element.value
                ).toBe('');
            });
    });

    it('stays put and says so inline when nothing matches', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'findOrderByReference').mockResolvedValue(undefined);
        const wrapper = mountSearch();

        return wrapper
            .get('[data-test=order-reference-search-input] input')
            .setValue('garbage')
            .then(() => wrapper.get('[data-test=order-reference-search-submit]').trigger('click'))
            .then(() => inlineMessage(wrapper))
            .then(() => {
                expect(wrapper.emitted('found')).toBeUndefined();
                expect(wrapper.find('[data-test=order-reference-search-error]').exists()).toBe(
                    true
                );
                expect(
                    wrapper.find('[data-test=order-reference-search-error]').classes()
                ).toContain('text-warning');
            });
    });

    it('clears the inline message once the operator starts typing again', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'findOrderByReference').mockResolvedValue(undefined);
        const wrapper = mountSearch();

        return wrapper
            .get('[data-test=order-reference-search-input] input')
            .setValue('garbage')
            .then(() => wrapper.get('[data-test=order-reference-search-submit]').trigger('click'))
            .then(() => inlineMessage(wrapper))
            .then(() =>
                wrapper.get('[data-test=order-reference-search-input] input').setValue('garbage2')
            )
            .then(() => {
                expect(wrapper.find('[data-test=order-reference-search-error]').exists()).toBe(
                    false
                );
            });
    });

    it('blocks inline, not with a toast, on a real failure', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'findOrderByReference').mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server error',
            errors: [{ code: 'INTERNAL', message: 'Server error' }]
        });
        const wrapper = mountSearch();

        return wrapper
            .get('[data-test=order-reference-search-input] input')
            .setValue('RF13 2EY8 H44V JAVZ KX80 JRL')
            .then(() => wrapper.get('[data-test=order-reference-search-submit]').trigger('click'))
            .then(() => inlineMessage(wrapper))
            .then(() => {
                expect(wrapper.emitted('found')).toBeUndefined();
                expect(wrapper.find('[data-test=order-reference-search-error]').exists()).toBe(
                    true
                );
                expect(
                    wrapper.find('[data-test=order-reference-search-error]').classes()
                ).toContain('text-error');
            });
    });

    it('disables the button while the field is blank', () => {
        const wrapper = mountSearch();

        expect(
            wrapper.get('[data-test=order-reference-search-submit]').attributes('disabled')
        ).toBeDefined();
    });
});
