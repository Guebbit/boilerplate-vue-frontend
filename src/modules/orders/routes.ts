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
        // `others`: `orders.self.read` would admit a customer; only the key on other people's
        // orders opens the staff page.
        meta: {
            access: 'auth',
            can: ['read', 'Order'],
            others: true,
            title: 'orders-list-page.page-title-sales'
        },
        component: () => import('./views/OrdersList.vue'),
        props: { scope: 'all' }
    },
    {
        path: 'orders/:id',
        name: 'OrderTarget',
        meta: { access: 'auth', title: 'order-target-page.page-title' },
        component: () => import('./views/Order.vue'),
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
