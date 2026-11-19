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
        component: () => import('./views/OrdersList.vue'),
        // The account page: the viewer's own orders, whatever they are allowed to read.
        props: { scope: 'mine' }
    },
    {
        path: 'sales/orders',
        name: 'SalesOrders',
        // `display`, not `read`: every signed-in account holds `read:Order` (its own orders),
        // and only the staff action opens the staff page.
        meta: {
            access: 'auth',
            can: ['display', 'Order'],
            title: 'orders-list-page.page-title-sales'
        },
        component: () => import('./views/OrdersList.vue'),
        props: { scope: 'all' }
    },
    {
        path: 'sales/orders/new',
        name: 'OrderCreate',
        // `create`, not `display`: raising an order is its own action, held apart from reading them.
        meta: { access: 'auth', can: ['create', 'Order'], title: 'order-create-page.page-title' },
        component: () => import('./views/OrderCreate.vue')
    },
    {
        path: 'orders/:id',
        name: 'OrderTarget',
        meta: { access: 'auth', title: 'order-target-page.page-title' },
        component: () => import('./views/OrderTarget.vue'),
        props: true
    },
    {
        path: 'orders/:id/edit',
        name: 'OrderEdit',
        meta: { access: 'auth', can: ['update', 'Order'], title: 'order-edit-page.page-title' },
        component: () => import('./views/OrderEdit.vue'),
        props: true
    }
] satisfies RouteRecordRaw[];
