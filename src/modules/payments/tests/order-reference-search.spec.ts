/**
 * @module
 * Mounts the real search component and spies on the store's own read, the same pattern
 * `record-offline-payment-form.spec.ts` uses: the field state and the navigation on success are
 * this component's job, the lookup itself is the store's, already proven in `store.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import OrderReferenceSearch from '@/modules/payments/components/OrderReferenceSearch.vue';
import { usePaymentsStore } from '@/modules/payments/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Order } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this test suite enables — needed for real, since the
 * component pushes to `OrderEdit` on a successful lookup.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

const anOrder = (id: string): Order => ({
    id,
    userId: 'user-1',
    email: 'shopper@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 0,
    status: 'pending'
});

const mountSearch = () =>
    mount(OrderReferenceSearch, {
        global: { plugins: [vuetify, i18n, router] }
    });

/**
 * A brief real flush for the "nothing changed" case below — there is no eventual condition to
 * poll FOR, only the absence of one, so `vi.waitFor` (used for the success case) does not fit.
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/orders').then(() => router.isReady()));
});

describe('OrderReferenceSearch', () => {
    it('jumps to the found order edit page and clears the field', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'findOrderByReference').mockResolvedValue(anOrder('order-1'));
        const wrapper = mountSearch();

        return wrapper
            .get('[data-test=order-reference-search-input] input')
            .setValue('RF13 2EY8 H44V JAVZ KX80 JRL')
            .then(() => wrapper.get('[data-test=order-reference-search-submit]').trigger('click'))
            .then(() =>
                // The route change is the eventual condition to poll for — `router.push`'s own
                // promise takes more than one microtask/macrotask hop the first time this spec's
                // lazily-imported `OrderEdit.vue` chunk resolves, which a fixed-length flush would
                // either race or over-wait.
                vi.waitFor(() => {
                    if (router.currentRoute.value.fullPath === '/en/orders')
                        throw new Error('still on /en/orders');
                })
            )
            .then(() => {
                expect(payments.findOrderByReference).toHaveBeenCalledWith(
                    'RF13 2EY8 H44V JAVZ KX80 JRL'
                );
                expect(router.currentRoute.value.fullPath).toBe('/en/orders/order-1/edit');
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
            .then(() => flush())
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/orders');
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
            .then(() => flush())
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
            .then(() => flush())
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/orders');
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
