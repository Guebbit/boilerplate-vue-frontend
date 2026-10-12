/**
 * @module
 * Route table for the payments domain — one staff page; paying is a panel on the order, not a
 * route.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Payments routes: the staff list. `others` because `payments.self.read` answers `can` for a
 * customer; only `payments.any.read` opens the page.
 */
export default [
    {
        path: 'sales/payments',
        name: 'PaymentsList',
        component: () => import('./views/PaymentsList.vue'),
        meta: {
            access: 'auth',
            can: ['read', 'Payment'],
            others: true,
            title: 'payments-list-page.page-title'
        }
    }
] satisfies RouteRecordRaw[];
