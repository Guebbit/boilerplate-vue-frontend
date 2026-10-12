/**
 * @module
 * The two stats pages, store-stubbed: when they load, with which period, what a failure looks like
 * and what a product page links to. The blocks they compose have their own specs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import StatsDashboard from '../views/StatsDashboard.vue';
import ProductSales from '../views/ProductSales.vue';
import { useStatsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { ProductSeries } from '@types';

wireModulesIntoCore();

/** The real route tree plus a stand-in for the orders page this module only links to. */
const makeRouter = () =>
    createRouter({
        history: createMemoryHistory(),
        routes: [
            {
                path: '/:locale',
                component: RouterView,
                children: [
                    ...collectModuleRoutes(enabledModules),
                    { path: 'sales/orders', name: 'SalesOrders', component: RouterView }
                ]
            }
        ]
    });

/** The picture, replaced by a marker. */
const MermaidStub = { props: ['definition', 'label'], template: '<pre data-test="stub-chart" />' };

/** What a product that sold something answers. */
const SERIES: ProductSeries = {
    period: { from: '2026-10-01', to: '2026-10-02', interval: 'day', timeZone: 'Europe/Rome' },
    productId: 'p1',
    title: 'Kibble',
    buckets: [{ start: '2026-09-30T22:00:00.000Z', unitsOrdered: 3, unitsReversed: 1 }]
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

/**
 * Opens the dashboard route and mounts the page there.
 *
 * @param router - The router to navigate and mount with.
 * @param url - Where to land, query included.
 * @returns The mounted page, once its first load has settled.
 */
const mountDashboard = (router: ReturnType<typeof makeRouter>, url = '/en/sales/stats') =>
    router.push(url).then(() => {
        const wrapper = mount(StatsDashboard, {
            global: { plugins: [router, vuetify, i18n], stubs: { MermaidChart: MermaidStub } }
        });
        return flushPromises().then(() => wrapper);
    });

/**
 * Opens a product's route and mounts the page there.
 *
 * @param router - The router to navigate and mount with.
 * @param url - Where to land, query included.
 * @returns The mounted page, once its first load has settled.
 */
const mountProduct = (router: ReturnType<typeof makeRouter>, url: string) =>
    router.push(url).then(() => {
        const wrapper = mount(ProductSales, {
            props: { productId: 'p1' },
            global: { plugins: [router, vuetify, i18n], stubs: { MermaidChart: MermaidStub } }
        });
        return flushPromises().then(() => wrapper);
    });

/**
 * Stubs the product series read to answer `series`, as the store would.
 *
 * @param series - What the read resolves with.
 * @returns The spy, for call assertions.
 */
const answerProductWith = (series: ProductSeries) => {
    const store = useStatsStore();
    return vi.spyOn(store, 'loadProductSales').mockImplementation(() => {
        store.productSeries = series;
        return Promise.resolve(series);
    });
};

describe('StatsDashboard', () => {
    it('loads every block for the last 30 days when the URL names no period', () => {
        const load = vi.spyOn(useStatsStore(), 'loadDashboard').mockResolvedValue(undefined);
        return mountDashboard(makeRouter()).then(() => {
            expect(load).toHaveBeenCalledTimes(1);
            const [period] = load.mock.calls[0];
            expect(period.interval).toBe('day');
            expect(new Date(period.to).getTime() - new Date(period.from).getTime()).toBe(
                29 * 86_400_000
            );
        });
    });

    it('opens on the period the URL carries', () => {
        const load = vi.spyOn(useStatsStore(), 'loadDashboard').mockResolvedValue(undefined);
        return mountDashboard(
            makeRouter(),
            '/en/sales/stats?from=2026-09-01&to=2026-09-07&interval=week'
        ).then(() => {
            expect(load).toHaveBeenCalledWith({
                from: '2026-09-01',
                to: '2026-09-07',
                interval: 'week'
            });
        });
    });

    it('reloads when the visitor applies a preset', () => {
        const load = vi.spyOn(useStatsStore(), 'loadDashboard').mockResolvedValue(undefined);
        return mountDashboard(makeRouter())
            .then((wrapper) => wrapper.get('[data-test=stats-preset-last-7]').trigger('click'))
            .then(() => {
                expect(load).toHaveBeenCalledTimes(2);
                expect(load.mock.calls[1][0].interval).toBe('day');
            });
    });

    it('shows a failed load as one alert above the blocks', () => {
        vi.spyOn(useStatsStore(), 'loadDashboard').mockRejectedValue({
            success: false,
            status: 500,
            message: 'Server exploded'
        });
        return mountDashboard(makeRouter()).then((wrapper) => {
            expect(wrapper.get('[data-test=stats-load-error]').text()).toContain('Server exploded');
        });
    });
});

describe('ProductSales', () => {
    it('reads the product for the period in the URL and shows its title', () => {
        const load = answerProductWith(SERIES);
        return mountProduct(
            makeRouter(),
            '/en/sales/stats/products/p1?from=2026-10-01&to=2026-10-07&interval=week'
        ).then((wrapper) => {
            expect(load).toHaveBeenCalledWith('p1', {
                from: '2026-10-01',
                to: '2026-10-07',
                interval: 'week'
            });
            expect(wrapper.get('[data-test=product-title]').text()).toBe('Kibble');
        });
    });

    it('links to the orders behind the numbers, filtered by product and paid days', () => {
        answerProductWith(SERIES);
        return mountProduct(
            makeRouter(),
            '/en/sales/stats/products/p1?from=2026-10-01&to=2026-10-07&interval=day'
        ).then((wrapper) => {
            const href = wrapper.get('[data-test=view-orders]').attributes('href');
            expect(href).toContain('/sales/orders');
            expect(href).toContain('productId=p1');
            expect(href).toContain('paidFrom=2026-10-01');
            expect(href).toContain('paidTo=2026-10-07');
        });
    });

    it('says so when the product sold nothing in the period', () => {
        answerProductWith({
            ...SERIES,
            title: undefined,
            buckets: [{ start: '2026-09-30T22:00:00.000Z', unitsOrdered: 0, unitsReversed: 0 }]
        });
        return mountProduct(makeRouter(), '/en/sales/stats/products/p1').then((wrapper) => {
            expect(wrapper.find('[data-test=sold-nothing]').exists()).toBe(true);
            // No frozen title: the id stands in for it.
            expect(wrapper.get('[data-test=product-title]').text()).toBe('p1');
        });
    });

    it('keeps the URL in step with the period it shows', () => {
        answerProductWith(SERIES);
        const router = makeRouter();
        return mountProduct(
            router,
            '/en/sales/stats/products/p1?from=2026-10-01&to=2026-10-07&interval=week'
        ).then(() => {
            expect(router.currentRoute.value.query).toMatchObject({
                from: '2026-10-01',
                to: '2026-10-07',
                interval: 'week'
            });
        });
    });
});
