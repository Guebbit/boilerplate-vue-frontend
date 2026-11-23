/**
 * @module
 * The product page's "add to cart" button, as the cart module contributes it to the
 * `product-actions` slot. Mounted on its own with a product as its prop — the page that hosts it
 * is `products`' concern and lives in that module's tests.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AddToCartButton from '../components/AddToCartButton.vue';
import { useCartStore } from '../store.ts';
import { MAX_GUEST_LINES } from '../domain';
import { useSessionStore } from '@/infrastructure/session.ts';
import { addCartItem } from '@api';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import type { CartResponse, Product, ProductAvailability } from '@types';
import { clearAvailability, recordAvailability } from '@/modules/products';
import { NO_PRODUCT_ACTIONS } from '@/modules/products/tests/product-fixtures.ts';

// The shop states the backorder promise; these cases are about the wording around it.
vi.mock('@/modules/shop', async (importOriginal) => {
    const { ref } = await import('vue');
    return {
        ...(await importOriginal<typeof import('@/modules/shop')>()),
        backorderPromiseDays: ref(30)
    };
});

/**
 * `addCartItem` alone is wrapped, real implementation and all (`vi.fn(actual.addCartItem)`
 * calls through unless a test overrides it): most cases spy on the STORE's own `addCartItem`
 * action instead, which never reaches this. Only the in-flight-guard test needs a controllable,
 * genuinely pending API call — `cart.loading` is real, TanStack-tracked state, so nothing short
 * of an actual in-flight request can make it true.
 */
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@api')>();
    return { ...actual, addCartItem: vi.fn(actual.addCartItem) };
});

wireModulesIntoCore();

/**
 * A cart with nothing in it — what a stubbed cart write resolves with.
 */
const EMPTY_CART: CartResponse = {
    items: [],
    summary: {
        itemsCount: 0,
        totalQuantity: 0,
        itemsTotal: '0.00',
        shippingCost: '0.00',
        totalPrice: '0.00',
        currency: 'EUR'
    },
    shipping: { required: false, options: [] },
    checkoutable: false
};

/**
 * A product with stock, the default shape under test.
 */
const IN_STOCK: Product = {
    id: 'p-in-stock',
    title: 'Available widget',
    price: '9.99',
    currency: 'EUR',
    actions: NO_PRODUCT_ACTIONS
};

/**
 * A signed-in visitor, so the button is enabled rather than gated behind a login.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };
};

/**
 * Mounts the button for a product, whose availability the host would already have read.
 *
 * @param product - The shape under test.
 * @param answer - What the availability read answered; in stock unless a case says otherwise.
 */
const mountButton = (product: Product, answer: Partial<ProductAvailability> = {}) => {
    recordAvailability(
        product.id,
        { productId: product.id, availability: 'in_stock', ...answer },
        0
    );
    return mount(AddToCartButton, { props: { product }, global: { plugins: [vuetify, i18n] } });
};

beforeEach(() => {
    clearAvailability();
    // The guest cart is saved in `localStorage`, which outlives a test's pinia.
    localStorage.clear();
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the shelf', () => {
    it('blocks buying what is out of stock', () => {
        signIn();
        const wrapper = mountButton(IN_STOCK, { availability: 'out_of_stock' });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test=add-to-cart]').text()).toContain('Out of stock');
    });

    it('blocks buying what is off sale, and says so instead of "Out of stock"', () => {
        signIn();
        const wrapper = mountButton(
            { ...IN_STOCK, purchasable: false },
            { availability: 'out_of_stock' }
        );

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test=add-to-cart]').text()).toContain('Not available right now');
    });

    it('holds the button back until the availability is known', () => {
        signIn();
        const wrapper = mount(AddToCartButton, {
            props: { product: IN_STOCK },
            global: { plugins: [vuetify, i18n] }
        });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
    });

    it('lets a preorder with allowance left be bought, and says "Preorder"', () => {
        signIn();
        const wrapper = mountButton(IN_STOCK, {
            availability: 'preorder',
            availabilityDate: '2027-03-15'
        });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();
        expect(wrapper.get('[data-test=add-to-cart]').text()).toContain('Preorder');
    });

    it('lets a backorder be bought and states its promise, a date or 30 days', () => {
        signIn();
        const dated = mountButton(
            { ...IN_STOCK, restockDate: '2027-03-15' },
            { availability: 'backorder', availabilityDate: '2027-03-15' }
        );
        const undated = mountButton(
            { ...IN_STOCK, id: 'p-undated' },
            { availability: 'backorder', availabilityDate: '2027-01-20' }
        );

        expect(dated.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();
        expect(dated.get('[data-test=add-to-cart]').text()).toContain('Backorder');
        expect(dated.get('[data-test=add-to-cart-promise]').text()).toMatch(/Ships by .*2027/);
        expect(undated.get('[data-test=add-to-cart-promise]').text()).toContain('within 30 days');
    });

    it('shuts a preorder whose allowance is full, as out of stock', () => {
        signIn();
        const wrapper = mountButton(IN_STOCK, { availability: 'out_of_stock' });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test=add-to-cart]').text()).not.toContain('Preorder');
    });

    it('allows buying what is in stock', () => {
        signIn();

        expect(
            mountButton(IN_STOCK).get('[data-test=add-to-cart]').attributes('disabled')
        ).toBeUndefined();
    });

    it('is enabled for a guest too, whose cart is a list in their own browser', () => {
        expect(
            mountButton(IN_STOCK).get('[data-test=add-to-cart]').attributes('disabled')
        ).toBeUndefined();
    });
});

describe('a guest adding', () => {
    it('writes to the guest list and asks the server for nothing', async () => {
        const cart = useCartStore();
        const serverAdd = vi.spyOn(cart, 'addCartItem');

        await mountButton(IN_STOCK).get('[data-test=add-to-cart]').trigger('click');

        expect(cart.guestLines).toEqual([{ productId: 'p-in-stock', quantity: 1 }]);
        expect(serverAdd).not.toHaveBeenCalled();
    });

    it('grows a line the guest already has', async () => {
        const cart = useCartStore();
        const wrapper = mountButton(IN_STOCK);

        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await wrapper.get('[data-test=add-to-cart]').trigger('click');

        expect(cart.guestLines).toEqual([{ productId: 'p-in-stock', quantity: 2 }]);
    });

    it('says so, in place, when the list already holds as many products as it may', async () => {
        const cart = useCartStore();
        cart.guestLines = Array.from({ length: MAX_GUEST_LINES }, (_unused, index) => ({
            productId: `other-${index}`,
            quantity: 1
        }));
        const wrapper = mountButton(IN_STOCK);

        await wrapper.get('[data-test=add-to-cart]').trigger('click');

        expect(cart.guestLines).toHaveLength(MAX_GUEST_LINES);
        expect(wrapper.get('[data-test=add-to-cart-error]').text()).toContain(
            'as many different products'
        );
    });

    it('says "not added" as a warning when stock held the whole add back', async () => {
        const cart = useCartStore();
        // Three are held and three are all that can be bought, so one more adds nothing.
        cart.guestLines = [{ productId: IN_STOCK.id, quantity: 3 }];
        const wrapper = mountButton(IN_STOCK, { quantityAvailable: 3 });

        await wrapper.get('[data-test=add-to-cart]').trigger('click');

        expect(cart.guestLines).toEqual([{ productId: IN_STOCK.id, quantity: 3 }]);
        const [toast] = useNotificationsStore().messages;
        expect(toast?.message).toContain('No more can be added right now');
        expect(toast?.type).toBe(EToastType.WARNING);
    });

    it('says "added" as a success when stock held nothing back', async () => {
        const wrapper = mountButton(IN_STOCK, { quantityAvailable: 3 });

        await wrapper.get('[data-test=add-to-cart]').trigger('click');

        const [toast] = useNotificationsStore().messages;
        expect(toast?.message).toBe('Product added to cart.');
        expect(toast?.type).not.toBe(EToastType.WARNING);
    });
});

/**
 * `POST /cart/items` is "add": the server grows a line the shopper already has, so the click sends
 * the ONE unit it means and never reads the cart to compute a total.
 */
describe('adding', () => {
    it('adds one unit and leaves the arithmetic to the server', async () => {
        signIn();
        const cart = useCartStore();
        const fetchCartSpy = vi.spyOn(cart, 'fetchCart');
        const addSpy = vi.spyOn(cart, 'addCartItem').mockResolvedValue(EMPTY_CART);

        const wrapper = mountButton(IN_STOCK);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(addSpy).toHaveBeenCalledWith(IN_STOCK.id, 1);
        expect(fetchCartSpy).not.toHaveBeenCalled();
    });

    it('says "not added" as a warning when the server clamped the add', async () => {
        signIn();
        const cart = useCartStore();
        vi.spyOn(cart, 'addCartItem').mockResolvedValue({
            ...EMPTY_CART,
            warnings: [
                {
                    code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
                    productId: IN_STOCK.id,
                    requested: 6,
                    resulting: 5
                }
            ]
        });

        await mountButton(IN_STOCK).get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        const [toast] = useNotificationsStore().messages;
        expect(toast?.message).toContain('No more can be added right now');
        expect(toast?.type).toBe(EToastType.WARNING);
    });

    it('says "added" as a success when the server took it as asked', async () => {
        signIn();
        vi.spyOn(useCartStore(), 'addCartItem').mockResolvedValue(EMPTY_CART);

        await mountButton(IN_STOCK).get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        const [toast] = useNotificationsStore().messages;
        expect(toast?.message).toBe('Product added to cart.');
        expect(toast?.type).not.toBe(EToastType.WARNING);
    });

    it("never lets a previous account's in-memory cart shape the quantity it sends", async () => {
        signIn();
        const cart = useCartStore();
        /**
         * A stale line left behind by whoever used this browser tab before — a different
         * account's cart, still in the store's memory because logout resets only the profile
         * store. A client that computed `existing + 1` from it would send 6.
         */
        cart.cart = {
            ...EMPTY_CART,
            items: [
                { productId: IN_STOCK.id, quantity: 5, availability: 'in_stock', canIncrease: true }
            ]
        };
        const addSpy = vi.spyOn(cart, 'addCartItem').mockResolvedValue(EMPTY_CART);

        const wrapper = mountButton(IN_STOCK);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(addSpy).toHaveBeenCalledWith(IN_STOCK.id, 1);
    });

    it('disables itself while a cart write is already in flight', async () => {
        signIn();
        const wrapper = mountButton(IN_STOCK);

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();

        /**
         * A genuinely pending API call: a double-click while the first is still out must not
         * fire a second.
         */
        let release: ((error: Error) => void) | undefined;
        const gate = new Promise<never>((_resolve, reject) => {
            release = reject;
        });
        vi.mocked(addCartItem).mockReturnValueOnce(gate);

        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();
        await nextRenderTick(wrapper);

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();

        release?.(new Error('network down'));
        await flushPromises();
    });
});
