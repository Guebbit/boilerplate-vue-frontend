import type { RouteRecordRaw } from 'vue-router';

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
