/**
 * @module
 * The product page's "add to cart" button, as the cart module contributes it to the
 * `product-actions` slot. Mounted on its own with a product as its prop — the page that hosts it
 * is `products`' concern and lives in that module's tests.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AddToCartButton from '@/modules/cart/components/AddToCartButton.vue';
import { useCartStore } from '@/modules/cart/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { addCartItem } from '@api';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import type { CartResponse, Product } from '@types';

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
        itemsTotal: 0,
        shippingCost: 0,
        totalPrice: 0,
        currency: 'EUR'
    },
    shipping: { required: false, selected: null, options: [] }
};

/**
 * A product with stock, the default shape under test.
 */
const IN_STOCK: Product = {
    id: 'p-in-stock',
    title: 'Available widget',
    price: 9.99,
    currency: 'EUR',
    onHand: 5,
    reserved: 1,
    available: 4
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
 * Mounts the button for a product.
 *
 * @param product - The shape under test.
 */
const mountButton = (product: Product) =>
    mount(AddToCartButton, { props: { product }, global: { plugins: [vuetify, i18n] } });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the shelf', () => {
    it('blocks buying what is out of stock', () => {
        signIn();
        const wrapper = mountButton({ ...IN_STOCK, onHand: 3, reserved: 3, available: 0 });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test=add-to-cart]').text()).toContain('Out of stock');
    });

    it('allows buying what is in stock', () => {
        signIn();

        expect(
            mountButton(IN_STOCK).get('[data-test=add-to-cart]').attributes('disabled')
        ).toBeUndefined();
    });

    it('stays disabled for a guest, who has no cart to write to', () => {
        expect(
            mountButton(IN_STOCK).get('[data-test=add-to-cart]').attributes('disabled')
        ).toBeDefined();
    });
});

// `POST /cart` is "add": the server grows a line the shopper already has, so the click sends
// the ONE unit it means and never reads the cart to compute a total.
describe('adding', () => {
    it('adds one unit and leaves the arithmetic to the server (FA30)', async () => {
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

    it("never lets a previous account's in-memory cart shape the quantity it sends", async () => {
        signIn();
        const cart = useCartStore();
        // A stale line left behind by whoever used this browser tab before — a different
        // account's cart, still in the store's memory because logout resets only the profile
        // store. A client that computed `existing + 1` from it would send 6.
        cart.cart = { ...EMPTY_CART, items: [{ productId: IN_STOCK.id, quantity: 5 }] };
        const addSpy = vi.spyOn(cart, 'addCartItem').mockResolvedValue(EMPTY_CART);

        const wrapper = mountButton(IN_STOCK);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(addSpy).toHaveBeenCalledWith(IN_STOCK.id, 1);
    });

    it('disables itself while a cart write is already in flight (FA39)', async () => {
        signIn();
        const wrapper = mountButton(IN_STOCK);

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();

        // A genuinely pending API call: a double-click while the first is still out must not
        // fire a second.
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
