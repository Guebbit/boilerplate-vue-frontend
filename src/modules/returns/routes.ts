/**
 * @module
 * Route table for the returns module: the list (a customer's own returns, or every one for staff —
 * the server decides which) and one return's page. Both need a session and nothing more; what a
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
        component: () => import('@/modules/returns/views/ReturnsList.vue')
    },
    {
        path: 'returns/:id',
        name: 'ReturnTarget',
        meta: { access: 'auth', title: 'return-target-page.page-title' },
        component: () => import('@/modules/returns/views/Return.vue'),
        props: true
    }
] satisfies RouteRecordRaw[];
