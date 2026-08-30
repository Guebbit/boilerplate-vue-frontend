/**
 * @module
 * Cart route table. One authenticated route, mounted by the app router under the
 * module's registered path.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The cart module's routes, merged into the app router by the module registry.
 */
export default [
    {
        path: 'cart',
        name: 'Cart',
        meta: { access: 'auth', title: 'cart-page.page-title' },
        component: () => import('@/modules/cart/views/Cart.vue')
    }
] as RouteRecordRaw[];
