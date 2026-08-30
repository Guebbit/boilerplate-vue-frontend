/**
 * @module
 * Route table for the products domain, consumed by the module manifest and merged into the app
 * router.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * The products module's routes: public list and detail, admin-only create and edit.
 */
export default [
    {
        path: 'products',
        name: 'ProductsList',
        meta: { title: 'products-list-page.page-title' },
        component: () => import('@/modules/products/views/ProductsList.vue')
    },
    {
        // Declared before `products/:id` so the intent is obvious at a glance. vue-router ranks
        // a static segment above a dynamic one regardless of order, so `create` could not be
        // swallowed as an id either way — but the users routes read the same way, and a reader
        // should not have to know the ranking rules to be sure.
        path: 'products/create',
        name: 'ProductCreate',
        meta: { access: 'admin', title: 'product-create-page.page-title' },
        component: () => import('@/modules/products/views/ProductCreate.vue')
    },
    {
        path: 'products/:id',
        name: 'ProductTarget',
        meta: { title: 'product-target-page.page-title' },
        component: () => import('@/modules/products/views/Product.vue'),
        props: true
    },
    {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        meta: { access: 'admin', title: 'product-edit-page.page-title' },
        component: () => import('@/modules/products/views/ProductEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
