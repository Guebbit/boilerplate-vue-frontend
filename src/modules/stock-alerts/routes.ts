/**
 * @module
 * Stock alerts route table. One authenticated page in the account, mounted by the app router under
 * the module's registered path.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The stock alerts module's routes, merged into the app router by the module registry.
 */
export default [
    {
        path: 'stock-alerts',
        name: 'StockAlerts',
        meta: { access: 'auth', title: 'stock-alerts-page.page-title' },
        component: () => import('./views/StockAlerts.vue')
    }
] satisfies RouteRecordRaw[];
