/**
 * @module
 * Cart route table. One route, open to guests and to the roles that may shop, mounted by the app
 * router under the module's registered path.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The cart module's routes, merged into the app router by the module registry.
 *
 * `access: 'open'`: a guest has a cart too (kept in their browser until sign-in), so the page is
 * theirs. `can` is then asked of signed-in visitors only, which keeps staff, who hold no basket,
 * out.
 */
export default [
    {
        path: 'cart',
        name: 'Cart',
        meta: { access: 'open', can: ['update', 'Cart'], title: 'cart-page.page-title' },
        component: () => import('./views/CartEntry.vue')
    }
] satisfies RouteRecordRaw[];
