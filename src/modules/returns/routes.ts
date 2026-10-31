/**
 * @module
 * Route table for the returns module: the list (a customer's own returns, or every one for staff —
 * the server decides which), the staff queue over it (`SalesReturns`, `read:Return`) and one return's
 * page. Only the queue needs a key beyond a session; what a
 * caller may DO to a return is `Return.actions`.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the returns module, mounted under the app's module registry.
 */
export default [
    {
        path: 'returns',
        name: 'ReturnsList',
        meta: { access: 'auth', title: 'returns-list-page.page-title' },
        component: () => import('./views/ReturnsList.vue')
    },
    {
        path: 'sales/returns',
        name: 'SalesReturns',
        // The staff queue over the same list: `read:Return` is "every return in the shop", which
        // only staff hold. A separate route so the admin menu can carry its own entry and badge.
        meta: {
            access: 'auth',
            can: ['read', 'Return'],
            title: 'returns-list-page.page-title-sales'
        },
        component: () => import('./views/ReturnsList.vue')
    },
    {
        path: 'returns/:id',
        name: 'ReturnTarget',
        meta: { access: 'auth', title: 'return-target-page.page-title' },
        component: () => import('./views/Return.vue'),
        props: true
    }
] satisfies RouteRecordRaw[];
