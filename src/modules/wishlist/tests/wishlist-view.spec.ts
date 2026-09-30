/**
 * @module
 * The wishlist page, mounted: the shapes the browser suite pays a database for, and one link
 * whose href has to carry an ID while its text carries a TITLE.
 *
 * The router is REAL — `createMemoryHistory` over the products routes under `/:locale`, the same
 * nesting `app/router/index.ts` builds. A `RouterLink` stub that drops `to` renders an anchor
 * with no href, so it agrees with any location at all; only a resolved href proves
 * `routerLinkI18n` and `ProductTarget` produce a URL the app can actually match.
 *
 * The seeded title differs from the id on purpose, so a link built from the title instead of
 * the id would fail here rather than pass by coincidence.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Wishlist from '@/modules/wishlist/views/Wishlist.vue';
import { useWishlistStore } from '../store';
import { useProductsStore } from '@/modules/products';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The saved product, and the title the products store holds for it — deliberately not the id.
 */
const PRODUCT_ID = '01J8ZQ7X4M0000000000000001';
const PRODUCT_TITLE = 'Wireless Headphones';

/*
 * The app's OWN route table, assembled the way `app/router/index.ts` assembles it — every enabled
 * module's routes under one `/:locale` parent. Naming `products`' routes directly would be
 * reaching past a sibling's barrel, and would also be the weaker assertion: a copy of
 * `products/:id` keeps agreeing with itself after the real route moves.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the page with the stores already holding `items`, so nothing depends on `onMounted`'s
 * fetch settling — the view is what is under test, not the transport.
 *
 * @param productIds - The saved lines, in order.
 * @returns The mounted wrapper.
 */
const mountWishlist = (productIds: string[]) => {
    const wishlist = useWishlistStore();
    const products = useProductsStore();

    wishlist.items = productIds.map((productId) => ({ productId }));
    products.addProduct({ id: PRODUCT_ID, title: PRODUCT_TITLE, price: 1, currency: 'EUR' });
    // `onMounted` fetches the lines and then the products; both are seeded above, so both are
    // answered from state rather than from a transport this spec does not exercise.
    vi.spyOn(wishlist, 'fetchWishlist').mockResolvedValue(wishlist.items);
    vi.spyOn(products, 'fetchProductsByIds').mockResolvedValue([]);

    return mount(Wishlist, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    // Without the dictionaries every `t()` renders its own key, and the label cases below would
    // compare one key against another and pass.
    return loadLocale('en').then(() => router.push('/en/wishlist').then(() => router.isReady()));
});

describe('the link on a saved item', () => {
    it('points at the product ID and reads as the product TITLE', () => {
        const wrapper = mountWishlist([PRODUCT_ID]);
        const link = wrapper.get('[data-test=wishlist-item] h2 a');

        expect(link.attributes('href')).toBe(`/en/products/${PRODUCT_ID}`);
        expect(link.text()).toBe(PRODUCT_TITLE);
    });

    it('resolves to ProductTarget carrying the id as its param', () => {
        const wrapper = mountWishlist([PRODUCT_ID]);
        const resolved = router.resolve(
            wrapper.get('[data-test=wishlist-item] h2 a').attributes('href') ?? ''
        );

        // The href above is a string; this is the half that says the app can MATCH it — a link
        // that 404s resolves to the catch-all, not to the product route.
        expect(resolved.name).toBe('ProductTarget');
        expect(resolved.params).toEqual({ locale: 'en', id: PRODUCT_ID });
    });
});

describe('the item list', () => {
    it('renders one card per saved line, keyed by its product', () => {
        const other = '01J8ZQ7X4M0000000000000002';
        const wrapper = mountWishlist([PRODUCT_ID, other]);

        expect(wrapper.findAll('[data-test=wishlist-item]')).toHaveLength(2);
        // The second product is not in the dictionary (deleted, or hidden from this shopper):
        // it reads as unavailable, never as its raw id, which a screen reader would spell out.
        expect(wrapper.findAll('[data-test=wishlist-item] h2 a').at(1)?.text()).toBe(
            'No longer available'
        );
    });

    it('names the product in both action labels, by title rather than by id', () => {
        const wrapper = mountWishlist([PRODUCT_ID]);

        // The mirror of the link: these three call sites SHOULD say the human name.
        expect(wrapper.get('[data-test=wishlist-move-to-cart]').attributes('aria-label')).toContain(
            PRODUCT_TITLE
        );
        expect(wrapper.get('[data-test=wishlist-remove]').attributes('aria-label')).toContain(
            PRODUCT_TITLE
        );
    });

    it('renders the empty state and no cards when nothing is saved', () => {
        const wrapper = mountWishlist([]);

        expect(wrapper.findAll('[data-test=wishlist-item]')).toHaveLength(0);
        expect(wrapper.find('.v-empty-state').exists()).toBe(true);
    });
});
