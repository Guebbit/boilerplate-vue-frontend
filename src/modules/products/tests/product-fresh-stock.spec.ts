/**
 * @module
 * The product page is where a stock number gets read, so opening it refetches even when the list
 * read the same product a moment ago (inside the store's five-minute window): the cached copy
 * renders at once, the fresh one is swapped in. The shopper's own cart and checkout writes end the
 * window early too. Real store and real page; `@api` is mocked at `getProductById`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { getProductById } from '@api';
import Product from '@/modules/products/views/Product.vue';
import { useProductsStore, invalidateProductsCache } from '@/modules/products/store';
import { queryClient } from '@/infrastructure/query-client.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    getProductById: vi.fn()
}));

/**
 * The real app router, scoped to the modules this suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Answers `GET /products/p1` with `available` units on the shelf, as the API would.
 *
 * @param available - the stock the server reports
 * @returns the mocked-response promise
 */
const serverHolds = (available: number) =>
    Promise.resolve(
        asStub<Awaited<ReturnType<typeof getProductById>>>({
            data: {
                id: 'p1',
                title: 'Widget',
                price: 9.99,
                currency: 'EUR',
                onHand: available,
                reserved: 0,
                available
            }
        })
    );

/**
 * Mounts the real product page for `p1`.
 *
 * @returns the wrapper
 */
const openPage = () =>
    mount(Product, {
        props: { id: 'p1' },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });

/**
 * The stock the page currently shows.
 *
 * @param wrapper - the mounted page
 * @returns the stat's text
 */
const shownStock = (wrapper: ReturnType<typeof openPage>) =>
    wrapper.get('[data-test=product-stock]').text();

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(getProductById).mockReset();
    return loadLocale('en').then(() => router.push('/en/products/p1').then(() => router.isReady()));
});

describe('opening the product page', () => {
    it('shows the cached copy at once, then swaps in the fresh one', () => {
        vi.mocked(getProductById).mockImplementationOnce(() => serverHolds(7));
        // A list read of the same product a moment ago: inside the five-minute window.
        return useProductsStore()
            .fetchProduct('p1')
            .then(() => {
                vi.mocked(getProductById).mockImplementationOnce(() => serverHolds(2));
                const wrapper = openPage();

                expect(shownStock(wrapper)).toContain('7');
                return flushPromises().then(() => {
                    expect(getProductById).toHaveBeenCalledTimes(2);
                    expect(shownStock(wrapper)).toContain('2');
                    wrapper.unmount();
                });
            });
    });
});

describe('invalidateProductsCache', () => {
    it('marks a fresh cached record stale, so the next read asks the server', () => {
        vi.mocked(getProductById).mockImplementation(() => serverHolds(7));
        const store = useProductsStore();

        return store
            .fetchProduct('p1')
            .then(() => store.fetchProduct('p1'))
            .then(() => {
                expect(getProductById).toHaveBeenCalledTimes(1);
                invalidateProductsCache();
                return store.fetchProduct('p1');
            })
            .then(() => {
                expect(getProductById).toHaveBeenCalledTimes(2);
                expect(
                    queryClient.getQueryCache().findAll({ queryKey: ['products'] }).length
                ).toBeGreaterThan(0);
            });
    });
});
