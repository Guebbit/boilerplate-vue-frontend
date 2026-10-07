/**
 * @module
 * The cart a guest sees: lines priced by one batched product read, steppers that change a list in
 * the browser, a way to sign in and come back, and what happens when a product has gone. Mounted
 * against a real router (for the `continue` link) with the products read stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import axe from 'axe-core';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import GuestCart from '../components/GuestCart.vue';
import { MAX_GUEST_LINE_QUANTITY } from '../domain';
import { useCartStore } from '../store';
import { searchProducts } from '@api';
import * as schemas from '@api/schemas';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import type { Product } from '@types';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchProducts: vi.fn()
}));

/**
 * The real routes, so `Login` resolves exactly as it does in the app.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * A catalogue product.
 *
 * @param id - The product id.
 * @param price - Its unit price.
 * @returns The product as the batch read answers it.
 */
const aProduct = (id: string, price: number): Product => ({
    id,
    title: `Product ${id}`,
    price,
    currency: 'EUR',
    inStock: true,
    lowStock: false
});

/**
 * The mounted page, unmounted after each case.
 */
let wrapper: VueWrapper | undefined;

/**
 * Makes the batched product search answer with whichever of `catalogue` the request asked for,
 * as the real endpoint does for the ids a guest may still see.
 *
 * @param catalogue - The products that exist.
 * @param gate - Holds the answer back until its promise settles; a rejection fails the read.
 */
const catalogueAnswers = (catalogue: Product[], gate?: () => Promise<unknown>) =>
    vi.mocked(searchProducts).mockImplementation((body) =>
        (gate?.() ?? Promise.resolve()).then(() => {
            const items = catalogue.filter(({ id }) => (body.id ?? []).includes(id));
            return asStub<Awaited<ReturnType<typeof searchProducts>>>(
                contractResponse(schemas.SearchProductsResponse, {
                    items,
                    meta: { totalItems: items.length, page: 1, pageSize: 100, totalPages: 1 }
                })
            );
        })
    );

/**
 * Mounts the page with a guest cart already holding `lines`, and the batched product read
 * answering with `catalogue`.
 *
 * @param lines - The guest cart, as `[productId, quantity]` pairs.
 * @param catalogue - The products the read still returns.
 * @param gate - Holds the read's answer back, or fails it.
 */
const mountPage = async (
    lines: [string, number][],
    catalogue: Product[] = lines.map(([id]) => aProduct(id, 10)),
    gate?: () => Promise<unknown>
) => {
    const cart = useCartStore();
    cart.guestLines = lines.map(([productId, quantity]) => ({ productId, quantity }));
    catalogueAnswers(catalogue, gate);
    wrapper = mount(GuestCart, {
        global: { plugins: [router, vuetify, i18n] },
        attachTo: document.body
    });
    await flushPromises();
    return { cart, wrapper };
};

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    document.body.innerHTML = '';
});

describe('an empty guest cart', () => {
    it('says so and offers the products, and asks the server nothing', async () => {
        const { wrapper: page } = await mountPage([]);

        expect(page.text()).toContain('Your cart is empty');
        expect(page.find('[data-test=guest-cart-item]').exists()).toBe(false);
        expect(searchProducts).not.toHaveBeenCalled();
    });
});

describe('a guest cart with lines', () => {
    it('prices each line from the batched read, in one request', async () => {
        const { wrapper: page } = await mountPage(
            [
                ['p1', 2],
                ['p2', 1]
            ],
            [aProduct('p1', 10), aProduct('p2', 4.5)]
        );

        expect(searchProducts).toHaveBeenCalledTimes(1);
        expect(searchProducts).toHaveBeenCalledWith({ id: ['p1', 'p2'], page: 1, pageSize: 2 });
        const prices = page.findAll('[data-test=guest-cart-line-price]').map((line) => line.text());
        expect(prices[0]).toContain('€20.00');
        expect(prices[1]).toContain('€4.50');
    });

    it('states the items total once every line is priced', async () => {
        const { wrapper: page } = await mountPage(
            [
                ['p1', 2],
                ['p2', 1]
            ],
            [aProduct('p1', 10), aProduct('p2', 4.5)]
        );

        expect(page.get('[data-test=guest-cart-total]').text()).toContain('€24.50');
    });

    it('shows no total while a line has no price yet, rather than a wrong one', async () => {
        const { wrapper: page } = await mountPage(
            [['p1', 2]],
            [],
            () => new Promise(() => undefined)
        );

        expect(page.find('[data-test=guest-cart-total]').exists()).toBe(false);
    });

    it('counts distinct lines and units in the summary', async () => {
        const { wrapper: page } = await mountPage([
            ['p1', 2],
            ['p2', 3]
        ]);

        const summary = page.get('[data-test=guest-cart-summary]').text();
        expect(summary).toContain('2');
        expect(summary).toContain('5');
    });

    it('offers no shipping, address or payment: checkout needs an account', async () => {
        const { wrapper: page } = await mountPage([['p1', 1]]);

        expect(page.find('[data-test=cart-checkout]').exists()).toBe(false);
        expect(page.get('[data-test=guest-cart-intro]').text()).toContain('Sign in to check out');
    });
});

describe('signing in from the guest cart', () => {
    it('goes to the login page and asks to come back to the cart', async () => {
        const { wrapper: page } = await mountPage([['p1', 1]]);

        const href = page.get('[data-test=guest-cart-sign-in]').attributes('href') ?? '';
        const url = new URL(href, 'http://localhost');

        expect(url.pathname).toBe('/en/login');
        expect(url.searchParams.get('continue')).toBe('/en/cart');
    });
});

describe('changing the lines', () => {
    it('steps a quantity up and down, saving to the guest list', async () => {
        const { wrapper: page, cart } = await mountPage([['p1', 2]]);

        await page.get('[data-test=guest-cart-increase]').trigger('click');
        expect(cart.guestLines).toEqual([{ productId: 'p1', quantity: 3 }]);

        await page.get('[data-test=guest-cart-decrease]').trigger('click');
        await page.get('[data-test=guest-cart-decrease]').trigger('click');
        expect(cart.guestLines).toEqual([{ productId: 'p1', quantity: 1 }]);
    });

    it('cannot step below one: removing is its own button', async () => {
        const { wrapper: page } = await mountPage([['p1', 1]]);

        expect(page.get('[data-test=guest-cart-decrease]').attributes('disabled')).toBeDefined();
    });

    it('cannot step past the most a line may hold', async () => {
        const { wrapper: page } = await mountPage([['p1', MAX_GUEST_LINE_QUANTITY]]);

        expect(page.get('[data-test=guest-cart-increase]').attributes('disabled')).toBeDefined();
    });

    it('names each control after its product, since the buttons are icons', async () => {
        const { wrapper: page } = await mountPage([['p1', 2]]);

        expect(page.get('[data-test=guest-cart-increase]').attributes('aria-label')).toBe(
            'Increase quantity of product Product p1'
        );
        expect(page.get('[data-test=guest-cart-remove]').attributes('aria-label')).toBe(
            'Remove product Product p1'
        );
    });

    it('removes a line, and the empty state takes over with the last one', async () => {
        const { wrapper: page, cart } = await mountPage([
            ['p1', 1],
            ['p2', 1]
        ]);

        await page.findAll('[data-test=guest-cart-remove]')[0]?.trigger('click');
        expect(cart.guestLines.map(({ productId }) => productId)).toEqual(['p2']);

        await page.get('[data-test=guest-cart-remove]').trigger('click');
        expect(page.text()).toContain('Your cart is empty');
    });
});

describe('clearing the cart', () => {
    it('asks first, and empties it on yes', async () => {
        const { wrapper: page, cart } = await mountPage([['p1', 1]]);
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);

        await page.get('[data-test=guest-cart-clear]').trigger('click');
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(cart.guestLines).toEqual([]);
    });

    it('leaves it alone on no', async () => {
        const { wrapper: page, cart } = await mountPage([['p1', 1]]);
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);

        await page.get('[data-test=guest-cart-clear]').trigger('click');
        await flushPromises();

        expect(cart.guestLines).toHaveLength(1);
    });
});

describe('a product that is no longer there', () => {
    it('leaves the cart with a toast and a note on the page, and the rest stays', async () => {
        const { wrapper: page, cart } = await mountPage(
            [
                ['gone', 2],
                ['kept', 1]
            ],
            [aProduct('kept', 10)]
        );

        expect(cart.guestLines).toEqual([{ productId: 'kept', quantity: 1 }]);
        expect(page.get('[data-test=guest-cart-vanished]').text()).toContain(
            'A product that is no longer available was removed'
        );
        const toast = useNotificationsStore().messages.find(({ message }) =>
            message.includes('no longer available')
        );
        expect(toast?.type).toBe(EToastType.WARNING);
    });

    it('counts several, in the plural', async () => {
        const { wrapper: page } = await mountPage(
            [
                ['gone1', 1],
                ['gone2', 1],
                ['kept', 1]
            ],
            [aProduct('kept', 10)]
        );

        expect(page.get('[data-test=guest-cart-vanished]').text()).toContain(
            '2 products that are no longer available were removed'
        );
    });

    it('says nothing when every product came back', async () => {
        const { wrapper: page } = await mountPage([['p1', 1]]);

        expect(page.find('[data-test=guest-cart-vanished]').exists()).toBe(false);
    });

    it('does not take a failed read for a vanished product: the lines stay, with an error', async () => {
        const { wrapper: page, cart } = await mountPage([['p1', 1]], [], () =>
            Promise.reject(new Error('network down'))
        );

        expect(cart.guestLines).toHaveLength(1);
        expect(page.get('[data-test=guest-cart-error]').text()).toContain('network down');
    });

    it('does not take a read the language switch cancelled for a vanished product', async () => {
        const read = Promise.withResolvers<undefined>();
        const { cart } = await mountPage([['p1', 1]], [], () => read.promise);

        await loadLocale('it');
        read.resolve(undefined);
        await flushPromises();

        expect(cart.guestLines).toHaveLength(1);
        await loadLocale('en');
    });
});

describe('the page, audited', () => {
    it('breaks no accessibility rule axe can check without a rendered page', async () => {
        await mountPage([
            ['p1', 2],
            ['p2', 1]
        ]);

        // https://github.com/dequelabs/axe-core/blob/master/doc/API.md#api-name-axerun
        // `color-contrast` needs real layout and styles, which jsdom does not compute.
        const results = await axe.run(document.body, {
            rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
        });

        expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`)).toEqual([]);
    });
});
