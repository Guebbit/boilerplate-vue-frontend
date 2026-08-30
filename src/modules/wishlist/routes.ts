/**
 * @module
 * Wishlist route table. One authenticated route, mounted by the app router under the
 * module's registered path.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The wishlist module's routes, merged into the app router by the module registry.
 */
export default [
    {
        path: 'wishlist',
        name: 'Wishlist',
        meta: { access: 'auth', title: 'wishlist-page.page-title' },
        component: () => import('@/modules/wishlist/views/Wishlist.vue')
    }
] as RouteRecordRaw[];
