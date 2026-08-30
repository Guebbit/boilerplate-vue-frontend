/**
 * @module
 * Route table for the orders module: each record pairs a path with the lazy-loaded
 * view and the `meta.access` level the router guard enforces.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the orders module, mounted under the app's module registry.
 */
export default [
    {
        path: 'orders',
        name: 'OrdersList',
        meta: { access: 'auth', title: 'orders-list-page.page-title' },
        component: () => import('@/modules/orders/views/OrdersList.vue')
    },
    {
        path: 'orders/:id',
        name: 'OrderTarget',
        meta: { access: 'auth', title: 'order-target-page.page-title' },
        component: () => import('@/modules/orders/views/Order.vue'),
        props: true
    },
    {
        path: 'orders/:id/edit',
        name: 'OrderEdit',
        meta: { access: 'admin', title: 'order-edit-page.page-title' },
        component: () => import('@/modules/orders/views/OrderEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
