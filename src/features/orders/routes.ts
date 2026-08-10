import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'orders',
        name: 'OrdersList',
        meta: { access: 'auth' },
        component: () => import('@/features/orders/views/OrdersList.vue')
    },
    {
        path: 'orders/:id',
        name: 'OrderTarget',
        meta: { access: 'auth' },
        component: () => import('@/features/orders/views/Order.vue'),
        props: true
    },
    {
        path: 'orders/:id/edit',
        name: 'OrderEdit',
        meta: { access: 'admin' },
        component: () => import('@/features/orders/views/OrderEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
