/**
 * @module
 * Mounts the real order detail page against a real, memory-history router — same template as
 * `products/tests/product-view.spec.ts`. Scoped to one thing: each line's picture comes from
 * `item.current`, resolved live against the catalogue, never a frozen `item.product.imageUrl` —
 * and a product with no picture carries none. `watchOrder` is stubbed so the store's own
 * fetch never runs; the order is seeded directly into the dictionary instead.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Order from '@/modules/orders/views/Order.vue';
import { useOrdersStore } from '@/modules/orders/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { reorder as apiReorder, listOrderCreditNotes, getOrderCreditNote } from '@api';
import { downloadBlob } from '@guebbit/js-toolkit';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { asStub } from '../../../../tests/support/stub.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { noopWatchHandle } from '../../../../tests/support/unit/watch-handle.ts';
import type { Order as OrderType } from '@types';

/**
 * `reorder` alone is wrapped, real implementation and all (`vi.fn(actual.reorder)` calls through
 * unless a test overrides it): every other case in this file goes through the orders store's own
 * mocked reads. Only the in-flight-guard test below needs a controllable, genuinely pending API
 * call — the CART store's `loading` is real, TanStack-tracked state now, so nothing short of an
 * actual in-flight request can make it true.
 */
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@api')>();
    return {
        ...actual,
        reorder: vi.fn(actual.reorder),
        listOrderCreditNotes: vi.fn(() => Promise.resolve({ data: [] })),
        getOrderCreditNote: vi.fn(() => Promise.resolve(new Blob(['%PDF-1.4'])))
    };
});

vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    downloadBlob: vi.fn()
}));

wireModulesIntoCore();

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
 * Mounts the detail page with `order` already the store's `currentOrder`, `actions` included so
 * `useOrderActionsRefetch` finds nothing missing and never forces a second, unmocked fetch.
 *
 * @param order - The shape under test.
 * @returns The mounted wrapper.
 */
const mountOrder = (order: OrderType) => {
    const store = useOrdersStore();
    vi.spyOn(store, 'watchOrder').mockImplementation(() => noopWatchHandle());
    store.addOrder(order);
    store.selectedOrderId = order.id;

    return mount(Order, {
        props: { id: order.id },
        global: {
            plugins: [router, vuetify, i18n],
            // `PaymentPanel`/`ShipmentPanel` fetch their own data as soon as an order id is
            // available — decoration on this page, not what is under test, and there is no
            // mocked transport here for either to talk to.
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                PaymentPanel: true,
                ShipmentPanel: true,
                WithdrawalPanel: true
            }
        }
    });
};

/** One line, everything but `current` fixed — only what each case asserts on changes. */
const lineWith = (current: OrderType['items'][number]['current']): OrderType['items'][number] => ({
    product: { id: 'p1', title: 'Gadget', price: 9.99, taxRate: 0 },
    quantity: 1,
    locale: 'en',
    current,
    taxAmount: 0,
    netAmount: 9.99
});

const BASE_ORDER: Omit<OrderType, 'items'> = {
    id: 'o1',
    email: 'buyer@example.com',
    status: 'pending',
    totalItems: 1,
    totalQuantity: 1,
    totalPrice: 9.99,
    netTotal: 9.99,
    taxTotal: 0,
    shippingNetAmount: 0,
    shippingTaxAmount: 0,
    taxSummary: [],
    paymentStatus: 'unpaid',
    fulfillmentStatus: 'unfulfilled',
    returnStatus: 'none',
    actions: {
        transitions: [],
        cancel: false,
        pay: false,
        start: false,
        ship: false,
        deliver: false,
        fulfill: false,
        override: [],
        invoice: false,
        withdraw: false
    }
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/orders/o1').then(() => router.isReady()));
});

describe('the invoice buttons', () => {
    it('are absent until the server says the order has been invoiced', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-download-invoice]').exists()).toBe(false);
        expect(wrapper.find('[data-test=order-view-invoice]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('are both enabled, with their normal labels, once actions.invoice is true', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith(null)],
            actions: {
                transitions: [],
                cancel: false,
                pay: false,
                start: false,
                ship: false,
                deliver: false,
                fulfill: false,
                override: [],
                invoice: true,
                withdraw: false
            }
        });

        const downloadButton = wrapper.get('[data-test=order-download-invoice]');
        expect(downloadButton.attributes('disabled')).toBeUndefined();
        expect(downloadButton.text()).toContain('Download invoice');

        const viewButton = wrapper.get('[data-test=order-view-invoice]');
        expect(viewButton.attributes('disabled')).toBeUndefined();
        expect(viewButton.text()).toContain('View invoice');

        wrapper.unmount();
    });
});

/**
 * An invoiced order, the only kind that can carry credit notes.
 */
const invoicedOrder = (): OrderType => ({
    ...BASE_ORDER,
    items: [lineWith(null)],
    actions: { ...BASE_ORDER.actions!, invoice: true }
});

describe('the credit notes', () => {
    const NOTE = {
        id: 'cn1',
        number: 'CN-2026-0001',
        issuedAt: '2026-09-30T10:00:00.000Z',
        currency: 'EUR',
        grandTotal: 9.99,
        refundId: 'r1'
    };

    beforeEach(() => {
        vi.mocked(listOrderCreditNotes).mockClear();
        vi.mocked(getOrderCreditNote).mockClear();
        vi.mocked(downloadBlob).mockClear();
    });

    it('are not requested for an order with no invoice', async () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });
        await flushPromises();

        expect(listOrderCreditNotes).not.toHaveBeenCalled();
        expect(wrapper.find('[data-test=order-credit-note-row]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('show no row for an invoiced order that was never refunded', async () => {
        const wrapper = mountOrder(invoicedOrder());
        await flushPromises();

        expect(listOrderCreditNotes).toHaveBeenCalledWith('o1');
        expect(wrapper.find('[data-test=order-credit-note-row]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('list one row per note, and download only the clicked one', async () => {
        const second = { ...NOTE, id: 'cn2', number: 'CN-2026-0002' };
        vi.mocked(listOrderCreditNotes).mockResolvedValueOnce({ data: [NOTE, second] } as never);
        const wrapper = mountOrder(invoicedOrder());
        await flushPromises();

        const rows = wrapper.findAll('[data-test=order-credit-note-row]');
        expect(rows).toHaveLength(2);
        expect(rows[0].text()).toContain('CN-2026-0001');

        await rows[1].get('[data-test=order-download-credit-note]').trigger('click');
        await flushPromises();

        expect(getOrderCreditNote).toHaveBeenCalledExactlyOnceWith('o1', 'cn2');
        expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(
            expect.any(Blob),
            'order-o1-credit-note-CN-2026-0002.pdf'
        );

        wrapper.unmount();
    });

    it('block the download in place when the server refuses it', async () => {
        vi.mocked(listOrderCreditNotes).mockResolvedValueOnce({ data: [NOTE] } as never);
        vi.mocked(getOrderCreditNote).mockRejectedValueOnce(new Error('rate limited'));
        const wrapper = mountOrder(invoicedOrder());
        await flushPromises();

        await wrapper.get('[data-test=order-download-credit-note]').trigger('click');
        await flushPromises();

        expect(downloadBlob).not.toHaveBeenCalled();
        expect(wrapper.get('[data-test=order-credit-note-error]').text()).not.toBe('');

        wrapper.unmount();
    });
});

describe('the order number', () => {
    it('is absent when the order carries none', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-number]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('shows once the order has one', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            orderNumber: '2026-000041',
            items: [lineWith(null)]
        });

        expect(wrapper.get('[data-test=order-number]').text()).toContain('2026-000041');

        wrapper.unmount();
    });
});

describe('the payment deadline (FA32c)', () => {
    it("passes the order's own payBy into PaymentPanel, not only TransferInstructionsPanel", () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            payBy: '2026-01-10T12:00:00.000Z',
            items: [lineWith(null)]
        });

        expect(wrapper.getComponent({ name: 'PaymentPanel' }).props('payBy')).toBe(
            '2026-01-10T12:00:00.000Z'
        );

        wrapper.unmount();
    });
});

describe('the VAT summary', () => {
    it('is absent on a pre-VAT order — no taxSummary at all', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-tax-summary]').exists()).toBe(false);
    });

    it('shows one row per rate, and the net/tax totals, once taxSummary is present', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            netTotal: 8.18,
            taxTotal: 1.81,
            taxSummary: [{ rate: 0.22, netAmount: 8.18, taxAmount: 1.81, grossAmount: 9.99 }],
            items: [lineWith(null)]
        });

        const summary = wrapper.get('[data-test=order-tax-summary]');
        expect(summary.text()).toContain('22%');
        expect(summary.text()).toContain('VAT summary');

        wrapper.unmount();
    });
});

/**
 * Grants (or withholds) `audit.any.read`, the ability the "History" link is gated on — see
 * `users/tests/user-view.spec.ts` for the same gate on the user detail page.
 *
 * @param canReadAuditLog - Whether to hold the ability.
 */
const signIn = (canReadAuditLog: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'operator1', email: 'operator@example.com', role: 'admin' };
    session.setAbilities({
        tenant: canReadAuditLog ? [['read', 'AuditLog']] : [],
        platform: []
    });
};

describe('the "History" link', () => {
    it('is absent for a visitor with no audit.any.read', () => {
        signIn(false);
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-history]').exists()).toBe(false);
    });

    it("links to the shop audit trail, filtered to this order's id, for a visitor who holds it", () => {
        signIn(true);
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        const link = wrapper.get('[data-test=order-history]');
        expect(link.attributes('href')).toBe('/en/audit?target=o1');
    });
});

describe('an order line’s price (FA32b)', () => {
    it("shows the frozen unit price and price × quantity, in the order's own currency", () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            currency: 'GBP',
            items: [{ ...lineWith(null), quantity: 3 }]
        });

        expect(wrapper.get('[data-test=order-item-unit-price]').text()).toContain('£9.99');
        expect(wrapper.get('[data-test=order-item-line-total]').text()).toContain('£29.97');
    });
});

describe('an order line’s picture', () => {
    it('renders the live imageUrl when the product still has one', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith({ imageUrl: '/images/live.jpg' })]
        });

        const image = wrapper.get('[data-test=lazy-image]');
        expect(image.attributes('data-placeholder')).toBeUndefined();
        expect(image.find('img').attributes('src')).toContain('/images/live.jpg');
    });

    it('falls back to the placeholder for a product that never had a picture (`current: {}`)', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith({})] });

        expect(wrapper.get('[data-test=lazy-image]').attributes('data-placeholder')).toBe('true');
    });

    it('falls back to the placeholder once the product is gone (`current: null`)', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.get('[data-test=lazy-image]').attributes('data-placeholder')).toBe('true');
    });
});

describe('the reorder button (FA39)', () => {
    it("disables on the CART store's own loading, not the orders store's", () => {
        // `reorder` runs under the cart store's `fetchAny` — a double-click firing it twice is
        // exactly the bug this guard removes, and the orders store's own `loading` (already
        // exercised by the invoice/cancel cases above) says nothing about it.
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });
        expect(wrapper.get('[data-test=order-reorder]').attributes('disabled')).toBeUndefined();

        // A genuinely pending API call — the cart store's `loading` is real, TanStack-tracked
        // state now, so nothing short of an actual in-flight `reorder` request moves it.
        let release: ((error: Error) => void) | undefined;
        const gate = new Promise<never>((_resolve, reject) => {
            release = reject;
        });
        vi.mocked(apiReorder).mockReturnValueOnce(gate);

        return wrapper
            .get('[data-test=order-reorder]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(
                    wrapper.get('[data-test=order-reorder]').attributes('disabled')
                ).toBeDefined();
                release?.(new Error('network down'));
                return nextRenderTick(wrapper);
            });
    });
});

/** The cart the API answers, holding exactly these products. */
const cartWith = (...productIds: string[]) =>
    asStub<Awaited<ReturnType<typeof apiReorder>>>({
        data: { items: productIds.map((productId) => ({ productId, quantity: 1 })) }
    });

/** The toasts the page has raised, newest last. */
const toasts = () => useNotificationsStore().messages.map(({ message }) => message);

describe('the reorder outcome', () => {
    it('says it plainly when every line came back', async () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });
        vi.mocked(apiReorder).mockResolvedValueOnce(cartWith('p1'));

        await wrapper.get('[data-test=order-reorder]').trigger('click');
        await flushPromises();

        expect(toasts()).toEqual(['Order added to cart.']);
    });

    it('names what the cart did not get when a product has left the catalogue', async () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });
        vi.mocked(apiReorder).mockResolvedValueOnce(cartWith());

        await wrapper.get('[data-test=order-reorder]').trigger('click');
        await flushPromises();

        expect(toasts()).toEqual(['Order added to cart, without what is no longer sold: Gadget.']);
    });
});

describe('the three statuses beside the order status', () => {
    it('shows the payment and fulfilment state, and no return chip while none is open', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.get('[data-test=order-payment-status]').text()).toBe('Unpaid');
        expect(wrapper.get('[data-test=order-fulfillment-status]').text()).toBe('Not started');
        expect(wrapper.find('[data-test=order-return-status]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('shows a partial refund and a return in progress as the server reports them', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith(null)],
            paymentStatus: 'partially_refunded',
            fulfillmentStatus: 'fulfilled',
            returnStatus: 'partially_returned'
        });

        expect(wrapper.get('[data-test=order-payment-status]').text()).toBe('Partially refunded');
        expect(wrapper.get('[data-test=order-fulfillment-status]').text()).toBe('Delivered');
        expect(wrapper.get('[data-test=order-return-status]').text()).toBe('Partly returned');

        wrapper.unmount();
    });
});

describe('the withdrawal panel', () => {
    it('is handed what the server said about the button, never a computed deadline', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith(null)],
            actions: {
                ...BASE_ORDER.actions!,
                withdraw: true,
                withdrawUntil: '2026-10-01T10:00:00Z'
            }
        });

        expect(wrapper.findComponent({ name: 'WithdrawalPanel' }).props()).toMatchObject({
            orderId: 'o1',
            canWithdraw: true,
            withdrawUntil: '2026-10-01T10:00:00Z'
        });

        wrapper.unmount();
    });
});

describe('goods with no right of withdrawal', () => {
    it('are marked on their line', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [
                {
                    ...lineWith(null),
                    product: {
                        id: 'p1',
                        title: 'Engraved mug',
                        price: 9.99,
                        taxRate: 0,
                        noWithdrawal: true
                    }
                }
            ]
        });

        expect(wrapper.get('[data-test=order-item-no-withdrawal]').text()).toContain(
            'No right of withdrawal'
        );

        wrapper.unmount();
    });

    it('carry no note on an ordinary line', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-item-no-withdrawal]').exists()).toBe(false);

        wrapper.unmount();
    });
});

/** Signs the viewer in holding exactly these abilities. */
const signInWith = (tenant: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'someone@example.com', role: 'customer' };
    session.setAbilities({ tenant, platform: [] });
};

describe('the edit button', () => {
    it('is hidden from a customer, who would only meet a guard refusal', () => {
        signInWith([['read', 'Order']]);
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=go-to-edit]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('is shown to staff who may update orders', () => {
        signInWith([['update', 'Order']]);
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=go-to-edit]').exists()).toBe(true);

        wrapper.unmount();
    });
});

describe('the shipping method', () => {
    it('reads as its name, not the id the order froze', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith(null)],
            shippingMethod: 'express',
            shippingCost: 5
        });

        const shipping = wrapper.get('[data-test=order-shipping]').text();
        expect(shipping).toContain('Express');
        expect(shipping).not.toContain('express');

        wrapper.unmount();
    });

    it('falls back to the id for a method this deployment has no wording for', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith(null)],
            shippingMethod: 'drone',
            shippingCost: 5
        });

        expect(wrapper.get('[data-test=order-shipping]').text()).toContain('drone');

        wrapper.unmount();
    });
});
