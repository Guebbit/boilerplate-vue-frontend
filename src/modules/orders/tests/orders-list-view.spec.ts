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
import { downloadBlob } from '@guebbit/js-toolkit';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import OrdersList from '../views/OrdersList.vue';
import { useOrdersStore } from '../store.ts';
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

vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    downloadBlob: vi.fn()
}));

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
 * Grants the one ability the lookup is gated on — `create:Payment`, the same key that gates
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
 * @param scope - Which page to mount: the account's own list, or the staff page over every order.
 * @returns The mounted wrapper.
 */
const mountList = (scope: 'mine' | 'all' = 'mine') => {
    const orders = useOrdersStore();
    vi.spyOn(orders, 'watchSearchOrders').mockReturnValue(
        asStub<ReturnType<typeof orders.watchSearchOrders>>({
            search: vi.fn(() => Promise.resolve())
        })
    );

    return mount(OrdersList, {
        props: { scope },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
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
        const wrapper = mountList('all');

        expect(wrapper.findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(false);
    });

    it('keeps it off the account page, even for an operator', () => {
        signInAsPaymentRecorder();

        expect(mountList().findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(false);
    });

    it('shows it to an operator who can, on the staff page', () => {
        signInAsPaymentRecorder();

        const wrapper = mountList('all');

        expect(wrapper.findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(true);
    });

    it('jumps to OrderEdit when the lookup emits a found order (the lookup itself does not)', () => {
        // `payments` declares no MODULE_EDGES reach into `orders`, so `OrderReferenceSearch`
        // emits rather than navigating; this page owns `OrderEdit` directly and is the one that
        // turns a found order into a push.
        signInAsPaymentRecorder();
        const wrapper = mountList('all');

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
                plugins: [router, vuetify, i18n]
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
 * The permanent delete is offered only where the API will accept it: a cancelled order that was
 * never paid. Every other row keeps the soft Delete alone.
 */
describe('OrdersList — the permanent-delete action', () => {
    it('shows it on a cancelled unpaid row and on no other', async () => {
        signInAsOrderDeleter();
        vi.mocked(searchOrders).mockResolvedValue(
            asStub<Awaited<ReturnType<typeof searchOrders>>>(
                contractResponse(schemas.SearchOrdersResponse, {
                    items: [
                        { ...order('open'), status: 'pending', paymentStatus: 'unpaid' },
                        { ...order('void'), status: 'cancelled', paymentStatus: 'unpaid' },
                        { ...order('billed'), status: 'cancelled', paymentStatus: 'refunded' }
                    ],
                    meta: { page: 1, pageSize: 10, totalItems: 3, totalPages: 1 }
                })
            )
        );

        const wrapper = mount(OrdersList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();

        const rows = wrapper.findAll('[data-test="list-row"]');
        const withHardDelete = rows.filter((row) =>
            row.find('[data-test="row-hard-delete"]').exists()
        );
        expect(rows).toHaveLength(3);
        expect(withHardDelete).toHaveLength(1);
        expect(withHardDelete[0]?.find('[data-test="row-view"]').attributes('href')).toMatch(
            /\/void$/
        );
    });
});

/**
 * Signs in with one read rule on orders: the wide one (`display:Order`, no owner pinned) makes a
 * viewer staff, the narrow one (`read:Order`, pinned to their own id) does not.
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
 * and the transfer queue are staff tools, not theirs.
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

    it('keeps them off the account page of someone who reads every order', () => {
        signInReadingOrders(false);

        const wrapper = mountList();

        expect(wrapper.text()).not.toContain('User ID');
        expect(wrapper.find('[data-test="filter-awaiting-transfer"]').exists()).toBe(false);
    });

    it('shows whoever reads every order the lookups and the transfer queue, edit rights or not', () => {
        signInReadingOrders(false);

        const wrapper = mountList('all');

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
            plugins: [router, vuetify, i18n]
        }
    });
    await flushPromises();
    return wrapper;
};

/** Finds the header cell whose text contains `title`. */
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

/** The first column names an order the way its mail and invoice do: by its number. */
describe('OrdersList — the order column', () => {
    it('shows each order by its number', async () => {
        vi.mocked(searchOrders).mockResolvedValue(
            asStub<Awaited<ReturnType<typeof searchOrders>>>(
                contractResponse(schemas.SearchOrdersResponse, {
                    items: [
                        { ...order('o-numbered'), orderNumber: '2026-0042' },
                        { ...order('o-other'), orderNumber: '2026-0043' }
                    ],
                    meta: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 }
                })
            )
        );

        const wrapper = mount(OrdersList, {
            global: {
                plugins: [router, vuetify, i18n]
            }
        });
        await flushPromises();

        const shown = wrapper.findAll('[data-test="row-order-number"]').map((cell) => cell.text());
        expect(shown).toEqual(['2026-0042', '2026-0043']);
    });
});

/**
 * The list says where the goods stand beside the status, and narrows by it — including the two
 * values a single-parcel shop never had, `on_hold` and `partially_fulfilled`.
 */
describe('OrdersList — the fulfilment chip and filter', () => {
    it('shows each row’s fulfilment in words, next to its status', async () => {
        vi.mocked(searchOrders).mockResolvedValue(
            asStub<Awaited<ReturnType<typeof searchOrders>>>(
                contractResponse(schemas.SearchOrdersResponse, {
                    items: [{ ...order('o-1'), fulfillmentStatus: 'partially_fulfilled' }],
                    meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
                })
            )
        );
        const wrapper = mount(OrdersList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();

        expect(wrapper.get('[data-test="row-fulfillment-status"]').text()).toBe('Partly shipped');
    });

    it('sends the chosen fulfilment to the API as a filter', async () => {
        vi.mocked(searchOrders).mockResolvedValue(
            asStub<Awaited<ReturnType<typeof searchOrders>>>(
                contractResponse(schemas.SearchOrdersResponse, {
                    items: [],
                    meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }
                })
            )
        );
        const wrapper = mount(OrdersList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();
        useOrdersStore().filters.fulfillmentStatus = 'on_hold';

        await wrapper.get('[data-test="search-submit"]').trigger('submit');
        await flushPromises();

        expect(searchOrders).toHaveBeenLastCalledWith(
            expect.objectContaining({ fulfillmentStatus: 'on_hold' })
        );
    });
});

/** Answers the search with one page of the given orders. */
const answerSearchWith = (items: ReturnType<typeof order>[]) =>
    vi.mocked(searchOrders).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof searchOrders>>>(
            contractResponse(schemas.SearchOrdersResponse, {
                items,
                meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }
            })
        )
    );

/**
 * "My orders" is the viewer's own list whatever the viewer may read: the account page pins the
 * owner, so a staff member opening it no longer sees the whole shop.
 */
describe('OrdersList — the account page pins the owner', () => {
    it('searches with the viewer’s own id, though the account may read every order', async () => {
        signInReadingOrders(false);
        answerSearchWith([order('o-1')]);

        mount(OrdersList, {
            props: { scope: 'mine' },
            global: { plugins: [router, vuetify, i18n] }
        });
        await flushPromises();

        expect(searchOrders).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'u1' }));
    });

    it('re-pins it after Reset clears the filters', async () => {
        signInReadingOrders(false);
        answerSearchWith([order('o-1')]);
        const wrapper = mount(OrdersList, {
            props: { scope: 'mine' },
            global: { plugins: [router, vuetify, i18n] }
        });
        await flushPromises();

        await wrapper.get('[data-test="search-reset"]').trigger('click');
        await flushPromises();

        expect(searchOrders).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'u1' }));
    });

    it('keeps the owner out of the URL it writes', async () => {
        signInReadingOrders(false);
        answerSearchWith([order('o-1')]);
        const wrapper = mount(OrdersList, {
            props: { scope: 'mine' },
            global: { plugins: [router, vuetify, i18n] }
        });
        await flushPromises();

        await wrapper.get('[data-test="search-submit"]').trigger('submit');
        await flushPromises();

        expect(router.currentRoute.value.query.userId).toBeUndefined();
    });

    it('is dropped on the staff page, unless the URL asked for a user', async () => {
        signInReadingOrders(false);
        answerSearchWith([order('o-1')]);
        useOrdersStore().filters.userId = 'u1';

        mount(OrdersList, {
            props: { scope: 'all' },
            global: { plugins: [router, vuetify, i18n] }
        });
        await flushPromises();

        expect(vi.mocked(searchOrders).mock.calls.at(-1)?.[0].userId).toBeUndefined();
    });

    it('keeps a user the staff page was explicitly asked for', async () => {
        signInReadingOrders(false);
        answerSearchWith([order('o-1')]);
        await router.push('/en/sales/orders?userId=u1');

        mount(OrdersList, {
            props: { scope: 'all' },
            global: { plugins: [router, vuetify, i18n] }
        });
        await flushPromises();

        expect(searchOrders).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'u1' }));
    });
});

/** What the list says about money and returns, and the dates and states it narrows by. */
describe('OrdersList — payment, return and date columns and filters', () => {
    it('shows the payment state, the return state when there is one, and when it was paid', async () => {
        answerSearchWith([
            {
                ...order('o-1'),
                status: 'paid',
                paymentStatus: 'partially_refunded',
                returnStatus: 'partially_returned',
                paidAt: '2026-03-04T10:00:00Z'
            },
            order('o-2')
        ]);
        const wrapper = mount(OrdersList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();

        const rows = wrapper.findAll('[data-test="list-row"]');
        expect(rows[0]?.get('[data-test="row-payment-status"]').text()).toBe('Partially refunded');
        expect(rows[0]?.get('[data-test="row-return-status"]').text()).toBe('Partly returned');
        expect(rows[0]?.get('[data-test="row-paid-at"]').text()).not.toBe('—');
        // An unpaid order with no return: one chip, and a dash where the paid date would be.
        expect(rows[1]?.find('[data-test="row-return-status"]').exists()).toBe(false);
        expect(rows[1]?.get('[data-test="row-paid-at"]').text()).toBe('—');
    });

    it('sends the days as inclusive instants, and the two states as they are', async () => {
        answerSearchWith([]);
        const wrapper = mount(OrdersList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();
        const { filters } = useOrdersStore();
        filters.createdFrom = '2026-03-01';
        filters.createdTo = '2026-03-31';
        filters.paidFrom = '2026-03-05';
        filters.paidTo = '2026-03-06';
        filters.paymentStatus = 'refunded';
        filters.returnStatus = 'returned';

        await wrapper.get('[data-test="search-submit"]').trigger('submit');
        await flushPromises();

        const request = vi.mocked(searchOrders).mock.calls.at(-1)?.[0];
        expect(new Date(request?.createdFrom ?? '').getTime()).toBe(
            new Date(2026, 2, 1, 0, 0, 0, 0).getTime()
        );
        expect(new Date(request?.createdTo ?? '').getTime()).toBe(
            new Date(2026, 2, 31, 23, 59, 59, 999).getTime()
        );
        expect(new Date(request?.paidFrom ?? '').getDate()).toBe(5);
        expect(new Date(request?.paidTo ?? '').getDate()).toBe(6);
        expect(request).toMatchObject({ paymentStatus: 'refunded', returnStatus: 'returned' });
    });

    it('sorts by the paid date from its header', async () => {
        answerSearchWith([order('o-1')]);
        const wrapper = mount(OrdersList, { global: { plugins: [router, vuetify, i18n] } });
        await flushPromises();

        await wrapper
            .findAll('th')
            .find((head) => head.text().includes('Paid'))
            ?.trigger('click');
        await flushPromises();

        expect(searchOrders).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: ['paidAt'] })
        );
    });
});

/**
 * Signs in holding the export key (`export:Order`) and the staff display the staff page needs.
 */
const signInAsExporter = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'manager@example.com', role: 'owner' };
    session.setAbilities({
        tenant: [
            ['read', 'Order', {}],
            ['export', 'Order', {}]
        ],
        platform: []
    });
};

/**
 * The CSV export: offered on the staff page to the key's holder only, sends the page's current
 * filters, hands the file to the browser, and words its two expected refusals itself.
 */
describe('OrdersList — the CSV export', () => {
    it('is absent without the key, and absent from the account page even with it', () => {
        signInReadingOrders(false);
        expect(mountList('all').find('[data-test="orders-export"]').exists()).toBe(false);

        signInAsExporter();
        expect(mountList('mine').find('[data-test="orders-export"]').exists()).toBe(false);
    });

    it('downloads the file for the filters on screen', async () => {
        signInAsExporter();
        const file = new Blob(['createdAt\n'], { type: 'text/csv' });
        const exportCsv = vi.spyOn(useOrdersStore(), 'exportOrdersCsv').mockResolvedValue(file);
        const wrapper = mountList('all');
        useOrdersStore().filters.status = 'paid';

        await wrapper.get('[data-test="orders-export"]').trigger('click');
        await flushPromises();

        expect(exportCsv).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }));
        expect(downloadBlob).toHaveBeenCalledWith(file, expect.stringMatching(/^orders-.*\.csv$/));
    });

    it('says to narrow the filters when the server refuses a file that big', async () => {
        signInAsExporter();
        vi.spyOn(useOrdersStore(), 'exportOrdersCsv').mockRejectedValue({
            status: 422,
            errors: [{ code: 'ORDER_EXPORT_TOO_LARGE', message: 'Over the cap' }]
        });
        const wrapper = mountList('all');

        await wrapper.get('[data-test="orders-export"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test="orders-export-error"]').text()).toContain(
            'Narrow the filters'
        );
        expect(downloadBlob).not.toHaveBeenCalled();
    });

    it('asks to wait when the export budget is spent', async () => {
        signInAsExporter();
        vi.spyOn(useOrdersStore(), 'exportOrdersCsv').mockRejectedValue({
            status: 429,
            errors: [{ message: 'Too many requests' }]
        });
        const wrapper = mountList('all');

        await wrapper.get('[data-test="orders-export"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test="orders-export-error"]').text()).toContain('Wait a little');
    });

    it('shows any other failure as the server worded it', async () => {
        signInAsExporter();
        vi.spyOn(useOrdersStore(), 'exportOrdersCsv').mockRejectedValue({
            status: 500,
            errors: [{ message: 'Export unavailable' }]
        });
        const wrapper = mountList('all');

        await wrapper.get('[data-test="orders-export"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test="orders-export-error"]').text()).toContain(
            'Export unavailable'
        );
    });
});
