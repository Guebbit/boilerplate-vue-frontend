/**
 * @module
 * Page-level gate for the RF-reference lookup: the orders list mounts `payments`'
 * `OrderReferenceSearch`, and only for an operator who could act on what it finds. What the
 * lookup itself does is proven where it lives — `payments/tests/order-reference-search.spec.ts`
 * for the field and the jump, `payments/tests/store.spec.ts` for the read behind it — so this
 * suite asserts the mount and nothing more.
 *
 * The component is stubbed by name rather than mocked through the barrel: it is the page's
 * decision to render it that is under test, not its innards, and a stub keeps the suite off the
 * real HTTP call its setup would otherwise fire.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { searchOrders } from '@api';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import OrdersList from '@/modules/orders/views/OrdersList.vue';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

/*
 * The one client call the soft-deleted-row suite needs answered for real; every other suite here
 * stubs the page's search outright and never reaches it.
 */
vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchOrders: vi.fn()
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
 * Grants the one ability the lookup is gated on — `payments.any.create`, the same key that gates
 * recording the payment the lookup leads to.
 */
const signInAsPaymentRecorder = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
    session.setAbilities({ tenant: [['create', 'Payment']], platform: [] });
};

/**
 * Mounts the page with the table's own paginated fetch stubbed — this suite is not about it.
 *
 * @returns The mounted wrapper.
 */
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
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                OrderReferenceSearch: { name: 'OrderReferenceSearch', template: '<div />' }
            }
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() => router.push('/en/orders').then(() => router.isReady()));
});

describe('OrdersList — the RF-reference lookup it mounts', () => {
    it('hides the lookup from a visitor who cannot record a payment', () => {
        const wrapper = mountList();

        expect(wrapper.findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(false);
    });

    it('shows it to an operator who can', () => {
        signInAsPaymentRecorder();

        const wrapper = mountList();

        expect(wrapper.findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(true);
    });

    it('jumps to OrderEdit when the lookup emits a found order — FA86: the lookup itself does not', () => {
        // `payments` declares no MODULE_EDGES reach into `orders`, so `OrderReferenceSearch`
        // emits rather than navigating; this page owns `OrderEdit` directly and is the one that
        // turns a found order into a push.
        signInAsPaymentRecorder();
        const wrapper = mountList();

        emitOn(wrapper.findComponent({ name: 'OrderReferenceSearch' }), 'found', anOrder());

        return vi
            .waitFor(() => {
                if (router.currentRoute.value.fullPath === '/en/orders')
                    throw new Error('still on /en/orders');
            })
            .then(() => {
                expect(router.currentRoute.value.fullPath).toBe('/en/orders/o1/edit');
            });
    });
});

/** Grants the delete key the row actions are gated on. */
const signInAsOrderDeleter = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
    session.setAbilities({ tenant: [['delete', 'Order']], platform: [] });
};

/** An order as the list reads it — a whole contract `Order`, so every column has its field. */
const order = (id: string, deletedAt?: string) =>
    anOrder({
        id,
        totalItems: 1,
        totalQuantity: 1,
        totalPrice: 10,
        netTotal: 10,
        createdAt: '2026-01-01T00:00:00Z',
        ...(deletedAt && { deletedAt })
    });

/**
 * A soft-deleted order is restored with its own action, never deleted a second time: DELETE is
 * one-way on the API.
 */
describe('OrdersList — a soft-deleted row', () => {
    it('offers Restore in place of Delete, and restores through the store', async () => {
        signInAsOrderDeleter();
        vi.mocked(searchOrders).mockResolvedValue(
            asStub<Awaited<ReturnType<typeof searchOrders>>>(
                contractResponse(schemas.SearchOrdersResponse, {
                    items: [order('live'), order('gone', '2026-02-01T00:00:00Z')],
                    meta: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }
                })
            )
        );
        const orders = useOrdersStore();
        const restore = vi.spyOn(orders, 'restoreOrder').mockResolvedValue(order('live'));

        const wrapper = mount(OrdersList, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
            }
        });
        await flushPromises();

        expect(wrapper.findAll('[data-test="row-restore"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-test="row-delete"]')).toHaveLength(1);

        await wrapper.get('[data-test="row-restore"]').trigger('click');

        expect(restore).toHaveBeenCalledWith('gone');
    });
});

/**
 * Signs in with one read rule on orders: the wide one (`orders.any.read`, no owner pinned) makes a
 * viewer staff, the narrow one (`orders.self.read`, pinned to their own id) does not.
 *
 * @param pinnedToOwner - whether the rule is the customer's own-orders read
 */
const signInReadingOrders = (pinnedToOwner: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
    session.setAbilities({
        tenant: [['read', 'Order', pinnedToOwner ? { userId: 'u1' } : {}]],
        platform: []
    });
};

/**
 * A customer's list is already only their own orders, so the search-by-id/user/product/email boxes
 * and the transfer queue are staff tools, not theirs (FA38).
 */
describe('OrdersList — which filters a viewer sees', () => {
    it('shows a customer only the filters that narrow their own list', () => {
        const wrapper = mountList();

        expect(wrapper.text()).not.toContain('User ID');
        expect(wrapper.find('[data-test="filter-awaiting-transfer"]').exists()).toBe(false);
        expect(wrapper.find('[data-test="filter-status"]').exists()).toBe(true);
    });

    it('shows a customer, who reads only their own, no lookups either', () => {
        signInReadingOrders(true);

        const wrapper = mountList();

        expect(wrapper.text()).not.toContain('User ID');
        expect(wrapper.find('[data-test="filter-awaiting-transfer"]').exists()).toBe(false);
    });

    it('shows whoever reads every order the lookups and the transfer queue, edit rights or not', () => {
        signInReadingOrders(false);

        const wrapper = mountList();

        expect(wrapper.text()).toContain('User ID');
        expect(wrapper.find('[data-test="filter-awaiting-transfer"]').exists()).toBe(true);
    });
});

/**
 * The header sorts the WHOLE result, on the server: a click on an API-sortable column becomes
 * `filters.sort` and a fresh search, a column the API cannot sort by stays inert.
 */
const mountWithRows = async () => {
    vi.mocked(searchOrders).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof searchOrders>>>(
            contractResponse(schemas.SearchOrdersResponse, {
                items: [order('o-1')],
                meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
            })
        )
    );
    const wrapper = mount(OrdersList, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    await flushPromises();
    return wrapper;
};

const headOf = (wrapper: Awaited<ReturnType<typeof mountWithRows>>, title: string) =>
    wrapper.findAll('th').find((head) => head.text().includes(title));

describe('OrdersList — sorting from the header', () => {
    it('sends the clicked column to the API as the sort, and keeps it in the store', async () => {
        const wrapper = await mountWithRows();

        await headOf(wrapper, 'Status')?.trigger('click');
        await flushPromises();

        expect(useOrdersStore().filters.sort).toBe('status');
        expect(searchOrders).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: ['status'] })
        );
    });

    it('leaves the derived total column inert', async () => {
        const wrapper = await mountWithRows();

        expect(headOf(wrapper, 'Total')?.classes()).not.toContain('v-data-table__th--sortable');
        expect(headOf(wrapper, 'Status')?.classes()).toContain('v-data-table__th--sortable');
    });
});

/**
 * The first column names an order the way its mail and invoice do: by number, with the id only as
 * the fallback for an order minted without one.
 */
describe('OrdersList — the order column', () => {
    it('shows the order number, and the id when there is none', async () => {
        vi.mocked(searchOrders).mockResolvedValue(
            asStub<Awaited<ReturnType<typeof searchOrders>>>(
                contractResponse(schemas.SearchOrdersResponse, {
                    items: [{ ...order('o-numbered'), orderNumber: '2026-0042' }, order('o-plain')],
                    meta: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }
                })
            )
        );

        const wrapper = mount(OrdersList, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
            }
        });
        await flushPromises();

        const shown = wrapper.findAll('[data-test="row-order-number"]').map((cell) => cell.text());
        expect(shown).toEqual(['2026-0042', 'o-plain']);
    });
});
