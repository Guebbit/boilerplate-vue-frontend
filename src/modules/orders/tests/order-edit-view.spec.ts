/**
 * @module
 * Mounts the real edit page against a real, memory-history router, proving `OrderEdit.vue` gains
 * `actions` the same way `Order.vue` does: a list-cache arrival — the orders list seeds the store
 * with a summary row carrying no `actions` — must not leave the page offering no moves. Same
 * template as `product-view.spec.ts`/`wishlist-view.spec.ts`: a real router over
 * `collectModuleRoutes(enabledModules)`, the store's own watch stubbed, and the forced re-fetch
 * `useOrderActionsRefetch` performs is exercised for real rather than pre-seeded away.
 *
 * `@/modules/payments` is mocked rather than imported past its barrel — `useOrderRefund` would
 * otherwise fire a real, unmocked HTTP call this suite has nothing to answer, and reaching its
 * store directly is exactly what `eslint-plugin-boundaries` forbids for a sibling module.
 * `RecordOfflinePaymentForm` is stubbed the same way, for the same reason: mounting the real one
 * would wire in `useRecordOfflinePayment` and a live payments store this suite never seeds.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { ref, nextTick } from 'vue';
import OrderEdit from '@/modules/orders/views/OrderEdit.vue';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { OrderStatus } from '@types';
import type { Order } from '@types';

wireModulesIntoCore();

vi.mock('@/modules/payments', () => ({
    useOrderRefund: () => ({ canRefund: ref(false), refund: () => Promise.resolve() }),
    RecordOfflinePaymentForm: {
        name: 'RecordOfflinePaymentForm',
        template: '<div data-test="record-offline-payment-form" />'
    }
}));

/**
 * Satisfies `watchOrder`'s `WatchStopHandle` return type without setting up a real watcher.
 */
const noopStopHandle = () => undefined;

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
 * A signed-in operator — `OrderEdit`'s route is `access: 'admin'` in the real router, though this
 * spec's bespoke router carries no guard to enforce it.
 */
const signInAsAdmin = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
};

/**
 * A minimal order, everything but what each case overrides.
 */
const anOrder = (overrides: Partial<Order> = {}): Order => ({
    id: 'o1',
    userId: 'u1',
    email: 'shopper@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 0,
    status: OrderStatus.pending,
    ...overrides
});

/**
 * Mounts the edit page exactly as a list-cache arrival would: the store already holds a SUMMARY
 * row for the id (no `actions`), and the stubbed `fetchOrder` answers what a real forced re-fetch
 * would — the DETAIL row `detailOrder` names. This exercises `useOrderActionsRefetch` for real
 * rather than seeding the answer directly, which is what would let the latch's own removal pass.
 *
 * @param detailOrder - The shape the forced re-fetch resolves to (carrying `actions`).
 * @returns The mounted wrapper.
 */
const mountFromListCache = (detailOrder: Order) => {
    const orders = useOrdersStore();
    vi.spyOn(orders, 'watchOrder').mockImplementation(() => noopStopHandle);
    orders.addOrder({ ...detailOrder, actions: undefined });
    orders.selectedOrderId = detailOrder.id;
    vi.spyOn(orders, 'fetchOrder').mockImplementation(() => {
        orders.addOrder(detailOrder);
        return Promise.resolve(detailOrder);
    });

    return mount(OrderEdit, {
        props: { id: detailOrder.id },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/orders/o1/edit').then(() => router.isReady())
    );
});

describe('a list-cache arrival gains actions', () => {
    it('offers every reachable status once the forced re-fetch lands', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.shipped,
            actions: {
                transitions: [OrderStatus.delivered, OrderStatus.cancelled],
                cancel: true,
                pay: false
            }
        });

        const wrapper = mountFromListCache(detail);

        // The mount itself proves nothing yet — `actions` only lands once the forced re-fetch's
        // promise resolves and Vue re-renders on it.
        return nextTick()
            .then(() => nextTick())
            .then(() => {
                const select = wrapper.getComponent({ name: 'VSelect' });
                const values = (select.props('items') as { value: string }[]).map(
                    (item) => item.value
                );

                // Exactly the two reachable statuses plus the current one — never the full
                // six-value enum, which is what a select built from the bare status list would
                // offer instead.
                expect(values.toSorted()).toEqual(['cancelled', 'delivered', 'shipped'].toSorted());
                expect(wrapper.get('[data-test=button-cancel-only]').attributes('disabled')).toBe(
                    undefined
                );
            });
    });

    it('leaves Cancel disabled once actions.cancel answers false', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.delivered,
            actions: { transitions: [], cancel: false, pay: false }
        });

        const wrapper = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(
                    wrapper.get('[data-test=button-cancel-only]').attributes('disabled')
                ).not.toBe(undefined);
                expect(
                    wrapper.get('[data-test=button-cancel-and-refund]').attributes('disabled')
                ).not.toBe(undefined);
            });
    });
});

describe('recording a payment by hand', () => {
    it('offers the form while the order can still reach paid', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.pending,
            actions: { transitions: [OrderStatus.cancelled], cancel: true, pay: true }
        });

        const wrapper = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=record-offline-payment-form]').exists()).toBe(true);
            });
    });

    it('withdraws the form once the order can no longer reach paid', () => {
        // The same gate the customer's own card form uses — a paid, shipped or cancelled order has
        // nothing left for either form to record.
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.paid,
            actions: { transitions: [OrderStatus.processing], cancel: true, pay: false }
        });

        const wrapper = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=record-offline-payment-form]').exists()).toBe(
                    false
                );
            });
    });
});
