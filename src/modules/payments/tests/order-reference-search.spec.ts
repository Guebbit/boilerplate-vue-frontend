/**
 * @module
 * Mounts the real search component and spies on the store's own read, the same pattern
 * `record-offline-payment-form.spec.ts` uses: the field state and this component's job stop at
 * EMITTING the found order's id — `payments` declares no `MODULE_EDGES` reach into `orders`, so
 * navigating to `OrderEdit` is the host's job, proven separately in `orders-list-view.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OrderReferenceSearch from '../components/OrderReferenceSearch.vue';
import { usePaymentsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

/** Mounts the reference search with the real i18n and Vuetify. */
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
        vi.spyOn(payments, 'findOrderIdByReference').mockResolvedValue('order-1');
        const wrapper = mountSearch();

        return wrapper
            .get('[data-test=order-reference-search-input] input')
            .setValue('RF13 2EY8 H44V JAVZ KX80 JRL')
            .then(() => wrapper.get('[data-test=order-reference-search-submit]').trigger('click'))
            .then(() => vi.waitFor(() => expect(wrapper.emitted('found')).toBeDefined()))
            .then(() => {
                expect(payments.findOrderIdByReference).toHaveBeenCalledWith(
                    'RF13 2EY8 H44V JAVZ KX80 JRL'
                );
                expect(wrapper.emitted('found')).toEqual([['order-1']]);
                expect(
                    wrapper.get<HTMLInputElement>('[data-test=order-reference-search-input] input')
                        .element.value
                ).toBe('');
            });
    });

    it('stays put and says so inline when nothing matches', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'findOrderIdByReference').mockResolvedValue(undefined);
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
        vi.spyOn(payments, 'findOrderIdByReference').mockResolvedValue(undefined);
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
        vi.spyOn(payments, 'findOrderIdByReference').mockRejectedValue(
            aProblem(500, [{ code: 'INTERNAL', message: 'Server error' }])
        );
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
