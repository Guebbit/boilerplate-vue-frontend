/**
 * @module
 * The product page refetches its details on every open even when a list read the same product a
 * moment ago (inside the store's five-minute window): the cached copy renders at once and the fresh
 * one is swapped in. The shopper's own cart and checkout writes end the window early too. Real store
 * and real page; `@api` is mocked at `getProductById`. The availability is another read (inventory's
 * watcher, `inventory/tests/use-watch-availability.spec.ts`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { getProductById } from '@api';
import Product from '../views/ProductTarget.vue';
import { useProductsStore, invalidateProductsCache } from '../store';
import { queryClient } from '@/infrastructure/query-client.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub';
import { NO_PRODUCT_ACTIONS } from './product-fixtures.ts';

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
 * Answers `GET /products/p1`: the details, carrying `title`.
 *
 * @param title - the title the server reports
 * @returns the mocked-response promise
 */
const serverHolds = (title: string) =>
    Promise.resolve(
        asStub<Awaited<ReturnType<typeof getProductById>>>({
            id: 'p1',
            title,
            price: '9.99',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
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
            plugins: [router, vuetify, i18n]
        }
    });

/**
 * The title the page currently shows.
 *
 * @param wrapper - the mounted page
 * @returns the hero's text
 */
const shownTitle = (wrapper: ReturnType<typeof openPage>) => wrapper.text();

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(getProductById).mockReset();
    return loadLocale('en').then(() => router.push('/en/products/p1').then(() => router.isReady()));
});

describe('opening the product page', () => {
    it('shows the cached copy at once, then swaps in the fresh one', () => {
        vi.mocked(getProductById).mockImplementationOnce(() => serverHolds('Widget'));
        // A list read of the same product a moment ago: inside the five-minute window.
        return useProductsStore()
            .fetchProduct('p1')
            .then(() => {
                vi.mocked(getProductById).mockImplementationOnce(() => serverHolds('Widget v2'));
                const wrapper = openPage();

                expect(shownTitle(wrapper)).toContain('Widget');
                expect(shownTitle(wrapper)).not.toContain('Widget v2');
                return flushPromises().then(() => {
                    expect(getProductById).toHaveBeenCalledTimes(2);
                    expect(shownTitle(wrapper)).toContain('Widget v2');
                    wrapper.unmount();
                });
            });
    });
});

describe('invalidateProductsCache', () => {
    it('marks a fresh cached record stale, so the next read asks the server', () => {
        vi.mocked(getProductById).mockImplementation(() => serverHolds('Widget'));
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
