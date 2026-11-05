/**
 * @module
 * Cart route table. One route, open to guests and to every signed-in account, mounted by the app
 * router under the module's registered path.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The cart module's routes, merged into the app router by the module registry.
 *
 * `access: 'open'`: a guest has a cart too (kept in their browser until sign-in), so the page is
 * theirs, and every signed-in account has one on the server, so no permission is asked.
 */
export default [
    {
        path: 'cart',
        name: 'Cart',
        meta: { access: 'open', title: 'cart-page.page-title' },
        component: () => import('./views/CartEntry.vue')
    }
] satisfies RouteRecordRaw[];
