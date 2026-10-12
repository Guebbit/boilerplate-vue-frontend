/**
 * @module
 * The three presentational blocks of the dashboard, fed canned answers: what they format and word,
 * never what they compute. Mermaid is stubbed; the figures come from the API as given.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import SalesSection from '../components/SalesSection.vue';
import ProductsSection from '../components/ProductsSection.vue';
import OperationsSection from '../components/OperationsSection.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type {
    CategoryStats,
    CustomerStats,
    OperationsStats,
    PaymentMix,
    PipelineStats,
    ProductStats,
    SalesFigures,
    SalesStats
} from '@types';

wireModulesIntoCore();

/** The CSV helper, observed. */
const downloadBlob = vi.hoisted(() => vi.fn());

vi.mock('@guebbit/js-toolkit', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@guebbit/js-toolkit')>()),
    downloadBlob
}));

/** The real route tree, so a product link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The picture, replaced by its source. */
const MermaidStub = {
    props: ['definition', 'label'],
    template: '<pre data-test="stub-chart">{{ definition }}</pre>'
};

/** Mount options shared by every block. */
const GLOBAL = { plugins: [router, vuetify, i18n], stubs: { MermaidChart: MermaidStub } };

/** The shop zone and window every answer reports. */
const PERIOD = {
    from: '2026-10-01',
    to: '2026-10-02',
    interval: 'day',
    timeZone: 'Europe/Rome'
} as const;

/** A full set of figures, overridden per case. */
const figures = (over: Partial<SalesFigures> = {}): SalesFigures => ({
    orders: 2,
    unitsOrdered: 3,
    unitsReversed: 1,
    netUnits: 2,
    grossSales: 80,
    discounts: 0,
    reversals: 10,
    netSales: 70,
    shipping: 5,
    taxes: 15.4,
    totalSales: 100,
    refunds: 12,
    averageOrderValue: 40,
    ...over
});

beforeEach(() => router.push('/en/sales/stats').then(() => loadLocale('en')));

describe('SalesSection', () => {
    /** One currency, two days, and a previous period 50% lower. */
    const SALES: SalesStats = {
        period: PERIOD,
        currencies: [
            {
                currency: 'EUR',
                totals: figures({ totalSales: 150 }),
                previous: figures({ totalSales: 100, orders: 0 }),
                buckets: [
                    {
                        start: '2026-09-30T22:00:00.000Z',
                        figures: figures({ totalSales: 100, orders: 1 })
                    },
                    {
                        start: '2026-10-01T22:00:00.000Z',
                        figures: figures({ totalSales: 50, orders: 1 })
                    }
                ]
            }
        ]
    };

    it('shows the headline cards with the change against the previous period', () => {
        const wrapper = mount(SalesSection, { props: { sales: SALES }, global: GLOBAL });
        const total = wrapper.get('[data-test=card-totalSales]').text();
        expect(total).toContain('€150.00');
        expect(total).toContain('+50% vs previous period');
    });

    it('says there is nothing to compare when the previous figure is zero', () => {
        const wrapper = mount(SalesSection, { props: { sales: SALES }, global: GLOBAL });
        expect(wrapper.get('[data-test=card-orders]').text()).toContain('No earlier figure');
    });

    it('draws sales and orders as two charts, in the shop days', () => {
        const wrapper = mount(SalesSection, { props: { sales: SALES }, global: GLOBAL });
        const sources = wrapper.findAll('[data-test=stub-chart]').map((chart) => chart.text());
        expect(sources).toHaveLength(2);
        expect(sources[0]).toContain('bar [100, 50]');
        expect(sources[1]).toContain('line [1, 1]');
        // 22:00 UTC on 30 Sep is 1 Oct in Rome.
        expect(sources[0]).toContain('"Oct 1", "Oct 2"');
    });

    it('lists the revenue table and exports it with the same labels', () => {
        const wrapper = mount(SalesSection, { props: { sales: SALES }, global: GLOBAL });
        const rows = wrapper.findAll('[data-test=revenue-table] tbody tr');
        expect(rows).toHaveLength(2);
        expect(rows[0].text()).toContain('Oct 1');
        return wrapper
            .get('[data-test=revenue-csv]')
            .trigger('click')
            .then(() => {
                const [csv, name] = downloadBlob.mock.calls[0] as [string, string];
                expect(name).toBe('revenue-EUR.csv');
                expect(csv.split('\r\n')[0]).toBe(
                    'Period,Orders,Gross,Reversals,Net,Taxes,Shipping,Total'
                );
                expect(csv.split('\r\n')[1]).toBe('Oct 1,1,80,10,70,15.4,5,100');
            });
    });

    it('keeps currencies apart, each with its own cards', () => {
        const sales: SalesStats = {
            ...SALES,
            currencies: [SALES.currencies[0], { ...SALES.currencies[0], currency: 'USD' }]
        };
        const wrapper = mount(SalesSection, { props: { sales }, global: GLOBAL });
        expect(wrapper.findAll('[data-test=sales-currency]').map((node) => node.text())).toEqual([
            'EUR',
            'USD'
        ]);
        expect(wrapper.findAll('[data-test=sales-cards]')).toHaveLength(2);
    });

    it('says so before the first answer', () => {
        const wrapper = mount(SalesSection, { global: GLOBAL });
        expect(wrapper.find('[data-test=sales-empty]').exists()).toBe(true);
    });
});

describe('ProductsSection', () => {
    /** Two products and a category. */
    const PRODUCTS: ProductStats = {
        period: PERIOD,
        products: [
            {
                productId: 'p1',
                title: 'Kibble',
                currency: 'EUR',
                unitsOrdered: 3,
                unitsReversed: 1,
                netUnits: 2,
                netSales: 40
            }
        ]
    };
    const CATEGORIES: CategoryStats = {
        period: PERIOD,
        categories: [{ category: 'Food', currency: 'EUR', unitsOrdered: 3, netSales: 40 }]
    };

    it('links a product to its own page, carrying the period', () => {
        const wrapper = mount(ProductsSection, {
            props: {
                products: PRODUCTS,
                categories: CATEGORIES,
                period: { from: '2026-10-01', to: '2026-10-07', interval: 'week' }
            },
            global: GLOBAL
        });
        const href = wrapper.get('[data-test=product-link]').attributes('href');
        expect(href).toContain('/sales/stats/products/p1');
        expect(href).toContain('from=2026-10-01');
        expect(href).toContain('interval=week');
    });

    it('draws categories as a pie and says a product can count twice', () => {
        const wrapper = mount(ProductsSection, {
            props: {
                products: PRODUCTS,
                categories: CATEGORIES,
                period: { from: '2026-10-01', to: '2026-10-07', interval: 'day' }
            },
            global: GLOBAL
        });
        expect(wrapper.get('[data-test=stub-chart]').text()).toContain('"Food" : 40');
        expect(wrapper.text()).toContain('counts in both');
    });

    it('shows an empty line when nothing sold', () => {
        const wrapper = mount(ProductsSection, {
            props: {
                products: { period: PERIOD, products: [] },
                period: { from: '2026-10-01', to: '2026-10-07', interval: 'day' }
            },
            global: GLOBAL
        });
        expect(wrapper.find('[data-test=products-empty]').exists()).toBe(true);
        expect(wrapper.find('[data-test=stub-chart]').exists()).toBe(false);
    });
});

describe('OperationsSection', () => {
    const OPERATIONS: OperationsStats = {
        period: PERIOD,
        cancellation: { placed: 4, cancelled: 1, rate: 0.25 },
        returns: { unitsOrdered: 3, unitsReturned: 1, rate: 0.33 },
        refunds: [{ currency: 'EUR', invoiced: 90, credited: 12, rate: 0.13 }]
    };
    const CUSTOMERS: CustomerStats = {
        period: PERIOD,
        customers: 2,
        newCustomers: 1,
        returningCustomers: 1,
        returningRate: 0.5
    };
    const PIPELINE: PipelineStats = {
        awaitingTransfers: [
            { currency: 'EUR', count: 2, amount: 50, nearestPayBy: '2026-10-20T10:00:00.000Z' }
        ],
        paidNotShipped: 3
    };
    const MIX: PaymentMix = {
        period: PERIOD,
        rows: [
            { method: 'card', provider: 'fake', currency: 'EUR', payments: 3, amount: 90 },
            {
                method: 'bank_transfer',
                provider: 'manual',
                currency: 'EUR',
                payments: 1,
                amount: 30
            }
        ]
    };

    it('words each rate with the counts behind it', () => {
        const wrapper = mount(OperationsSection, {
            props: {
                operations: OPERATIONS,
                customers: CUSTOMERS,
                pipeline: PIPELINE,
                paymentMix: MIX
            },
            global: GLOBAL
        });
        expect(wrapper.get('[data-test=card-cancellation]').text()).toContain('1 of 4 orders');
        expect(wrapper.get('[data-test=card-returns]').text()).toContain('1 of 3 units');
        expect(wrapper.get('[data-test=card-refund-rate]').text()).toContain(
            '€12.00 credited of €90.00'
        );
        expect(wrapper.get('[data-test=card-customers]').text()).toContain('1 new, 1 returning');
        expect(wrapper.get('[data-test=card-awaiting]').text()).toContain(
            '2 orders, nearest deadline'
        );
        expect(wrapper.get('[data-test=card-paid-not-shipped]').text()).toContain('3');
    });

    it('names a pie slice by method and provider', () => {
        const wrapper = mount(OperationsSection, {
            props: { operations: OPERATIONS, paymentMix: MIX },
            global: GLOBAL
        });
        const source = wrapper.get('[data-test=stub-chart]').text();
        expect(source).toContain('"Card · fake" : 3');
        expect(source).toContain('"Bank transfer · manual" : 1');
    });

    it('leaves out an awaiting deadline that does not exist', () => {
        const wrapper = mount(OperationsSection, {
            props: {
                pipeline: {
                    awaitingTransfers: [{ currency: 'EUR', count: 1, amount: 9 }],
                    paidNotShipped: 0
                }
            },
            global: GLOBAL
        });
        expect(wrapper.get('[data-test=card-awaiting]').text()).not.toContain('deadline');
    });
});
