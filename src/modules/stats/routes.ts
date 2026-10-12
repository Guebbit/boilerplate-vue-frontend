/**
 * @module
 * Route table for the stats domain — two admin pages, lazy-loaded so the chart library behind them
 * downloads only when one is opened.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Stats routes: the dashboard and one product's sales. Both need `stats.any.read`, which the
 * server grants to manager and admin; the subject has no `self` twin, so `can` alone is enough.
 */
export default [
    {
        path: 'sales/stats',
        name: 'StatsDashboard',
        component: () => import('./views/StatsDashboard.vue'),
        meta: { access: 'auth', can: ['read', 'Stats'], title: 'stats-page.page-title' }
    },
    {
        path: 'sales/stats/products/:productId',
        name: 'StatsProductSales',
        component: () => import('./views/ProductSales.vue'),
        props: true,
        meta: { access: 'auth', can: ['read', 'Stats'], title: 'stats-page.product-sales-title' }
    }
] satisfies RouteRecordRaw[];
