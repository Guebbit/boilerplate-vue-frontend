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
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { ref, nextTick } from 'vue';
import OrderEdit from '@/modules/orders/views/OrderEdit.vue';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { OrderStatus } from '@api';
import type { Order, OrderActions } from '@types';

wireModulesIntoCore();

const refreshPayment = vi.fn(() => Promise.resolve());
const mockCanRefund = ref(false);
const mockRefundLoading = ref(false);

vi.mock('@/modules/payments', () => ({
    useOrderRefund: () => ({
        canRefund: mockCanRefund,
        refund: () => Promise.resolve(),
        refreshPayment,
        refundLoading: mockRefundLoading
    }),
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
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'admin' };
};

/**
 * `OrderActions`, defaulted to "nothing" — each case overrides only the fields its own scenario
 * is about, rather than restating `start`/`ship`/`deliver`/`override` (this suite's concern only
 * in "the correct-status door" below) at every call site.
 */
const anAction = (overrides: Partial<OrderActions> = {}): OrderActions => ({
    transitions: [],
    cancel: false,
    pay: false,
    start: false,
    ship: false,
    deliver: false,
    fulfill: false,
    override: [],
    invoice: false,
    ...overrides
});

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
    netTotal: 0,
    taxTotal: 0,
    shippingNetAmount: 0,
    shippingTaxAmount: 0,
    taxSummary: [],
    status: OrderStatus.pending,
    ...overrides
});

/**
 * Mounts the edit page exactly as a list-cache arrival would: the store already holds a SUMMARY
 * row for the id (no `actions`), and the stubbed `fetchOrder` answers what a real forced re-fetch
 * would — the DETAIL row `detailOrder` names. This exercises `useOrderActionsRefetch` for real
 * rather than seeding the answer directly, which is what would let the latch's own removal pass.
 *
 * The `fetchOrder` spy is returned alongside the wrapper — spied BEFORE mounting, since the page
 * destructures its actions off the store at setup time (see the override test's own note) — so a
 * later action's own forced re-fetch (`runOverride`) can be asserted on too, not just the one
 * `useOrderActionsRefetch` fires on mount.
 *
 * @param detailOrder - The shape the forced re-fetch resolves to (carrying `actions`).
 * @returns The mounted wrapper, and the `fetchOrder` spy driving it.
 */
const mountFromListCache = (detailOrder: Order) => {
    const orders = useOrdersStore();
    vi.spyOn(orders, 'watchOrder').mockImplementation(() => noopStopHandle);
    orders.addOrder({ ...detailOrder, actions: undefined });
    orders.selectedOrderId = detailOrder.id;
    const fetchOrder = vi.spyOn(orders, 'fetchOrder').mockImplementation(() => {
        orders.addOrder(detailOrder);
        return Promise.resolve(detailOrder);
    });

    const wrapper = mount(OrderEdit, {
        props: { id: detailOrder.id },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, fetchOrder };
};

beforeEach(() => {
    setActivePinia(createPinia());
    refreshPayment.mockClear();
    mockCanRefund.value = false;
    mockRefundLoading.value = false;
    return loadLocale('en').then(() =>
        router.push('/en/orders/o1/edit').then(() => router.isReady())
    );
});

describe('a list-cache arrival gains actions', () => {
    it('enables Cancel once the forced re-fetch lands', () => {
        // `status` is not a form field any more (SH1) — the moves this page renders from
        // `actions` are the cancel/refund/override controls, not a status select, so proving the
        // re-fetch landed means proving THOSE gain their real state.
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.shipped,
            actions: anAction({
                transitions: [OrderStatus.delivered, OrderStatus.cancelled],
                cancel: true,
                pay: false
            })
        });

        const { wrapper } = mountFromListCache(detail);

        // The mount itself proves nothing yet — `actions` only lands once the forced re-fetch's
        // promise resolves and Vue re-renders on it.
        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(wrapper.get('[data-test=button-cancel-only]').attributes('disabled')).toBe(
                    undefined
                );
            });
    });

    it('leaves Cancel disabled once actions.cancel answers false', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.delivered,
            actions: anAction({ transitions: [], cancel: false, pay: false })
        });

        const { wrapper } = mountFromListCache(detail);

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

describe('refunding', () => {
    it('disables Refund only while a refund is in flight, even though the orders store is idle', () => {
        signInAsAdmin();
        mockCanRefund.value = true;
        const detail = anOrder({
            status: OrderStatus.pending,
            actions: anAction({ transitions: [], cancel: true, pay: false })
        });
        const { wrapper } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                // The orders store's own `loading` is idle — only the payments store's is not.
                expect(wrapper.get('[data-test=button-refund-only]').attributes('disabled')).toBe(
                    undefined
                );
                mockRefundLoading.value = true;
                return nextTick();
            })
            .then(() => {
                expect(
                    wrapper.get('[data-test=button-refund-only]').attributes('disabled')
                ).not.toBe(undefined);
            });
    });
});

describe('cancelling', () => {
    it('re-reads the payment once the order is cancelled', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.pending,
            actions: anAction({ transitions: [OrderStatus.cancelled], cancel: true, pay: false })
        });
        // Spied BEFORE mounting, same reasoning as the override test above.
        const cancelOrder = vi
            .spyOn(useOrdersStore(), 'cancelOrder')
            .mockResolvedValue({ ...detail, status: OrderStatus.cancelled });
        const { wrapper } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => wrapper.get('[data-test=button-cancel-only]').trigger('click'))
            .then(() => nextTick())
            .then(() => nextTick())
            .then(() => {
                expect(cancelOrder).toHaveBeenCalledWith('o1', false);
                // Cancelling the order leaves a sibling `succeeded` payment's `actions.refund`
                // stale unless the payment itself is re-read too.
                expect(refreshPayment).toHaveBeenCalledTimes(1);
            });
    });
});

describe('the correct-status door', () => {
    it('stays hidden with an empty actions.override', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.shipped,
            // `override` left at `anAction`'s empty default — no permission, or nothing left
            // overridable, read the same way here: the server already decided.
            actions: anAction({ transitions: [OrderStatus.delivered], cancel: true, pay: false })
        });

        const { wrapper } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=button-override]').exists()).toBe(false);
            });
    });

    it('submits the picked status and reason once actions.override names a destination', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.shipped,
            actions: anAction({
                transitions: [OrderStatus.delivered],
                cancel: true,
                pay: false,
                override: [OrderStatus.delivered]
            })
        });
        // Spied BEFORE mounting: the component destructures `overrideStatus` off the store at
        // setup time, so a spy attached after mount would replace the store's own method while
        // the component keeps holding the original, unspied reference.
        const overrideStatus = vi
            .spyOn(useOrdersStore(), 'overrideStatus')
            .mockResolvedValue({ ...detail, status: OrderStatus.delivered });
        const { wrapper, fetchOrder } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=button-override]').exists()).toBe(true);
                // The select/textarea are Vuetify components, not native inputs — emitting
                // `update:modelValue` on the component instance is how a v-model bind is driven
                // in a mounted test, the same as the status-select test above reads through the
                // component's own props rather than simulating a click-driven menu.
                //
                // `getComponent` with a CSS selector types as `WrapperLike`, which omits `.vm` —
                // the selector's own uniqueness (one match, a Vue SFC, not a DOM-only node) is
                // what the object-selector overload would otherwise prove for us.
                (
                    wrapper.getComponent('[data-test="override-status-select"]') as VueWrapper
                ).vm.$emit('update:modelValue', OrderStatus.delivered);
                return nextTick();
            })
            .then(() => {
                (wrapper.getComponent('[data-test="override-reason"]') as VueWrapper).vm.$emit(
                    'update:modelValue',
                    'carrier scan never arrived'
                );
                return nextTick();
            })
            .then(() => nextTick())
            .then(() => wrapper.get('[data-test=button-override]').trigger('click'))
            .then(() => nextTick())
            .then(() => {
                expect(overrideStatus).toHaveBeenCalledWith(
                    'o1',
                    OrderStatus.delivered,
                    'carrier scan never arrived'
                );
                // Only the one forced re-fetch `useOrderActionsRefetch` already made on mount:
                // `overrideStatus` writes through the store's own `updateTarget` now, so a second,
                // per-view forced re-fetch would just repeat what the store already guarantees.
                expect(fetchOrder).toHaveBeenCalledTimes(1);
            });
    });
});

describe('the edit form (FA31)', () => {
    it('sends no fields when the form is submitted unchanged', () => {
        signInAsAdmin();
        const detail = anOrder();
        const updateOrder = vi
            .spyOn(useOrdersStore(), 'updateOrder')
            .mockResolvedValue({ ...detail });
        const { wrapper } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => nextTick())
            .then(() => {
                expect(updateOrder).toHaveBeenCalledWith('o1', {});
            });
    });

    it('sends `email` once the field actually changes', () => {
        signInAsAdmin();
        const detail = anOrder();
        const updateOrder = vi
            .spyOn(useOrdersStore(), 'updateOrder')
            .mockResolvedValue({ ...detail, email: 'billing@example.com' });
        const { wrapper } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                (wrapper.getComponent('[data-test="order-edit-email"]') as VueWrapper).vm.$emit(
                    'update:modelValue',
                    'billing@example.com'
                );
                return nextTick();
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => nextTick())
            .then(() => {
                expect(updateOrder).toHaveBeenCalledWith('o1', { email: 'billing@example.com' });
            });
    });
});

describe('recording a payment by hand', () => {
    it('offers the form while the order can still reach paid', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.pending,
            actions: anAction({ transitions: [OrderStatus.cancelled], cancel: true, pay: true })
        });

        const { wrapper } = mountFromListCache(detail);

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
            actions: anAction({ transitions: [OrderStatus.processing], cancel: true, pay: false })
        });

        const { wrapper } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=record-offline-payment-form]').exists()).toBe(
                    false
                );
            });
    });

    it('force-refreshes the order once a payment is recorded', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.pending,
            actions: anAction({ transitions: [OrderStatus.cancelled], cancel: true, pay: true })
        });
        const { wrapper, fetchOrder } = mountFromListCache(detail);

        return nextTick()
            .then(() => nextTick())
            .then(() =>
                wrapper.findComponent({ name: 'RecordOfflinePaymentForm' }).vm.$emit('recorded')
            )
            .then(() => nextTick())
            .then(() => {
                // The mount-time forced re-fetch from `useOrderActionsRefetch` is the first call;
                // this is the second, PL-60's own.
                expect(fetchOrder).toHaveBeenLastCalledWith(detail.id, { forced: true });
            });
    });

    it('reports the refresh error, without touching the form', () => {
        signInAsAdmin();
        const detail = anOrder({
            status: OrderStatus.pending,
            actions: anAction({ transitions: [OrderStatus.cancelled], cancel: true, pay: true })
        });
        const orders = useOrdersStore();
        vi.spyOn(orders, 'watchOrder').mockImplementation(() => noopStopHandle);
        orders.addOrder({ ...detail, actions: detail.actions });
        orders.selectedOrderId = detail.id;
        vi.spyOn(orders, 'fetchOrder').mockRejectedValue(new Error('network down'));

        const wrapper = mount(OrderEdit, {
            props: { id: detail.id },
            global: {
                plugins: [router, vuetify, i18n],
                stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
            }
        });

        return nextTick()
            .then(() => nextTick())
            .then(() =>
                wrapper.findComponent({ name: 'RecordOfflinePaymentForm' }).vm.$emit('recorded')
            )
            .then(() => nextTick())
            .then(() => nextTick())
            .then(() => {
                expect(
                    wrapper.find('[data-test=order-edit-offline-payment-error]').text()
                ).not.toBe('');
            });
    });
});
