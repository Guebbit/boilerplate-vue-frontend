/**
 * @module
 * Route table for the payments domain — one staff page; paying is a panel on the order, not a
 * route.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Payments routes: the staff list. `display`, not `read`, because `read:Payment` answers `can` for a
 * customer; only `display:Payment` opens the page.
 */
export default [
    {
        path: 'sales/payments',
        name: 'PaymentsList',
        component: () => import('./views/PaymentsList.vue'),
        meta: {
            access: 'auth',
            can: ['display', 'Payment'],
            title: 'payments-list-page.page-title'
        }
    }
] satisfies RouteRecordRaw[];
