/**
 * @module
 * Mounts the real orders list page to prove the "find by reference" lookup: paste an RF reference
 * (or a legacy raw id) and land on that order's edit page — `OrderEdit.vue` is already "show the
 * order, mark it paid", so this never grows a second one of its own.
 *
 * `@/modules/payments` is mocked, same reason as `order-edit-view.spec.ts`: `useOrderByReference`
 * would otherwise fire a real, unmocked HTTP call this suite has nothing to answer, and reaching
 * its internals directly is exactly what `eslint-plugin-boundaries` forbids for a sibling module.
 * `useOrdersStore().watchSearchOrders` is stubbed for the same reason as the table search itself —
 * this suite is not about the list's own paginated fetch.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { ref } from 'vue';
import OrdersList from '@/modules/orders/views/OrdersList.vue';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import type { Order } from '@types';

wireModulesIntoCore();

/**
 * The reference-lookup state `useOrderByReference` would own for real — held at module scope so
 * the mock factory and the tests below share the same refs.
 */
const referenceOrder = ref<Order>();
const referenceNotFound = ref(false);
const findByReference = vi.fn(() => Promise.resolve());
const resetReferenceLookup = vi.fn(() => {
    referenceOrder.value = undefined;
    referenceNotFound.value = false;
});

vi.mock('@/modules/payments', () => ({
    useOrderByReference: () => ({
        order: referenceOrder,
        notFound: referenceNotFound,
        loading: ref(false),
        findByReference,
        reset: resetReferenceLookup
    })
}));

/**
 * The real app router, scoped to the modules this test suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * A signed-in operator who may edit an order — `session.can('update', 'Order')` gates both the
 * lookup card and the existing per-row Edit button.
 */
const signInAsAdmin = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
    session.setAbilities({ tenant: [['update', 'Order']], platform: [] });
};

const mountList = () => {
    const orders = useOrdersStore();
    vi.spyOn(orders, 'watchSearchOrders').mockReturnValue(
        asStub<ReturnType<typeof orders.watchSearchOrders>>({
            search: vi.fn(() => Promise.resolve())
        })
    );

    return mount(OrdersList, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    referenceOrder.value = undefined;
    referenceNotFound.value = false;
    findByReference.mockImplementation(() => Promise.resolve());
    return loadLocale('en').then(() => router.push('/en/orders').then(() => router.isReady()));
});

describe('OrdersList — find order by bank transfer reference', () => {
    it('hides the lookup card from a visitor who cannot edit orders', () => {
        const wrapper = mountList();

        expect(wrapper.find('[data-test=reference-lookup-card]').exists()).toBe(false);
    });

    it('navigates to the order edit page once a reference resolves to an order', () => {
        signInAsAdmin();
        findByReference.mockImplementation(() => {
            referenceOrder.value = { id: 'o1' } as Order;
            return Promise.resolve();
        });
        const wrapper = mountList();

        return wrapper
            .get('[data-test=reference-lookup-input] input')
            .setValue('RF13 2EY8 H44V JAVZ KX80 JRL')
            .then(() => wrapper.get('[data-test=reference-lookup-form]').trigger('submit'))
            .then(() =>
                // The handler chains a lookup and then a router navigation — both real promises
                // with their own microtask hops — so the assertion polls rather than assuming one
                // `nextTick` is enough to have settled both.
                vi.waitFor(() => expect(router.currentRoute.value.name).toBe('OrderEdit'), 2000)
            )
            .then(() => {
                expect(findByReference).toHaveBeenCalledWith('RF13 2EY8 H44V JAVZ KX80 JRL');
                expect(router.currentRoute.value.params.id).toBe('o1');
            });
    });

    it('shows "no order matches this reference" on a 404, without navigating', () => {
        signInAsAdmin();
        findByReference.mockImplementation(() => {
            referenceOrder.value = undefined;
            referenceNotFound.value = true;
            return Promise.resolve();
        });
        const wrapper = mountList();

        return wrapper
            .get('[data-test=reference-lookup-input] input')
            .setValue('nonsense')
            .then(() => wrapper.get('[data-test=reference-lookup-form]').trigger('submit'))
            .then(() => {
                expect(wrapper.find('[data-test=reference-lookup-not-found]').exists()).toBe(true);
                expect(router.currentRoute.value.name).toBe('OrdersList');
            });
    });

    it('does nothing on submit while the field is blank', () => {
        signInAsAdmin();
        const wrapper = mountList();

        return wrapper
            .get('[data-test=reference-lookup-form]')
            .trigger('submit')
            .then(() => {
                expect(findByReference).not.toHaveBeenCalled();
            });
    });
});
