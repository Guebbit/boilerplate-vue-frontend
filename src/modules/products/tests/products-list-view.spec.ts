/**
 * @module
 * The catalogue page picks its presentation from what the viewer may DO: staff get the table and
 * its row actions, everyone else (guests included) the storefront grid with no back-office
 * control on it. Both sort on the server — a header click or the select writes `filters.sort` and
 * searches again; the page never reorders the rows it holds.
 *
 * `searchProducts` is the one mocked client call, so the real store, real toolkit search and real
 * page run together and the request that goes out is what is asserted.
 */
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { searchProducts } from '@api';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import SortSelect from '@/ui/molecules/SortSelect.vue';
import ProductsList from '@/modules/products/views/ProductsList.vue';
import { useProductsStore } from '@/modules/products/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { aProduct } from '../../../../tests/support/unit/fixtures.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchProducts: vi.fn(),
    getCatalogueFacets: vi.fn(() => Promise.resolve({ data: { categories: [], tags: [] } }))
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
 * Answers every search with these titles, one product each.
 */
const answerWith = (...titles: string[]) =>
    vi.mocked(searchProducts).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof searchProducts>>>(
            contractResponse(schemas.SearchProductsResponse, {
                items: titles.map((title, index) => aProduct({ id: `p${index}`, title })),
                meta: {
                    page: 1,
                    pageSize: 10,
                    totalItems: titles.length,
                    totalPages: 1
                }
            })
        )
    );

/**
 * Signs the viewer in holding exactly these abilities.
 */
const signInWith = (tenant: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'someone@example.com', role: 'customer' };
    session.setAbilities({ tenant, platform: [] });
};

/**
 * Mounts the page and lets its first search land.
 */
const mounted: { unmount: () => void }[] = [];

const mountList = async () => {
    const wrapper = mount(ProductsList, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
    mounted.push(wrapper);
    await flushPromises();
    return wrapper;
};

afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

beforeEach(() => {
    // The session persists its sign-in; without this a staff case leaks into the next one.
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() => router.push('/en/products').then(() => router.isReady()));
});

describe('ProductsList — grid for shoppers, table for staff', () => {
    it('shows a guest the storefront grid, with a card per product and no table', async () => {
        answerWith('Walnut desk', 'Oak stool');

        const wrapper = await mountList();

        expect(wrapper.findAll('[data-test=product-card]')).toHaveLength(2);
        expect(wrapper.find('table').exists()).toBe(false);
        expect(wrapper.find('[data-test=row-edit]').exists()).toBe(false);
        expect(wrapper.find('[data-test=create-product]').exists()).toBe(false);
    });

    it('shows a shopper who can only read the same grid', async () => {
        signInWith([['read', 'Product']]);
        answerWith('Walnut desk');

        const wrapper = await mountList();

        expect(wrapper.findAll('[data-test=product-card]')).toHaveLength(1);
        expect(wrapper.find('table').exists()).toBe(false);
    });

    it('shows staff the table with its row actions, and no cards', async () => {
        signInWith([
            ['update', 'Product'],
            ['delete', 'Product']
        ]);
        answerWith('Walnut desk');

        const wrapper = await mountList();

        expect(wrapper.find('table').exists()).toBe(true);
        expect(wrapper.find('[data-test=row-edit]').exists()).toBe(true);
        expect(wrapper.find('[data-test=product-card]').exists()).toBe(false);
    });

    it('treats a role that can only edit as staff too', async () => {
        signInWith([['update', 'Product']]);
        answerWith('Walnut desk');

        const wrapper = await mountList();

        expect(wrapper.find('table').exists()).toBe(true);
    });

    it('says so, in place of an empty grid, when nothing matches', async () => {
        answerWith();

        const wrapper = await mountList();

        expect(wrapper.find('[data-test=products-empty]').exists()).toBe(true);
        expect(wrapper.find('[data-test=product-card]').exists()).toBe(false);
    });

    it('keeps the by-id filter for staff: a shopper has no use for it', async () => {
        answerWith('Walnut desk');
        const guest = await mountList();
        expect(guest.text()).not.toContain('Product ID');
        guest.unmount();

        signInWith([['update', 'Product']]);
        const staff = await mountList();
        expect(staff.text()).toContain('Product ID');
    });
});

describe('ProductsList — sorting on the server', () => {
    it('sends the shopper’s select choice as the sort, and restarts from page 1', async () => {
        answerWith('Walnut desk');
        const wrapper = await mountList();
        useProductsStore().pageCurrent = 3;

        emitOn(wrapper.findComponent(SortSelect), 'update:modelValue', '-price');
        await flushPromises();

        expect(useProductsStore().filters.sort).toBe('-price');
        expect(useProductsStore().pageCurrent).toBe(1);
        expect(searchProducts).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: ['-price'], page: 1 })
        );
    });

    it('sends staff’s header click the same way, and leaves the unsortable columns inert', async () => {
        signInWith([['update', 'Product']]);
        answerWith('Walnut desk');
        const wrapper = await mountList();
        const head = (title: string) =>
            wrapper.findAll('th').find((cell) => cell.text().includes(title));

        await head('Price')?.trigger('click');
        await flushPromises();

        expect(searchProducts).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: ['price'] })
        );
        expect(head('Price')?.classes()).toContain('v-data-table__th--sortable');
        expect(head('Active')?.classes()).not.toContain('v-data-table__th--sortable');
    });

    it('sends no sort at all until one is chosen', async () => {
        answerWith('Walnut desk');

        await mountList();

        expect(vi.mocked(searchProducts).mock.calls.at(0)?.[0]?.sort).toBeUndefined();
    });
});
