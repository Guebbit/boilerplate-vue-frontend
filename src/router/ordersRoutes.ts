import type { RouteRecordRaw } from 'vue-router';
import { isAuth, isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'orders',
        name: 'OrdersList',
        beforeEnter: [isAuth],
        component: () => import('@/views/OrdersList.vue')
    },
    {
        path: 'orders/:id',
        name: 'OrderTarget',
        beforeEnter: [isAuth],
        component: () => import('@/views/Order.vue'),
        props: true
    },
    {
        path: 'orders/:id/edit',
        name: 'OrderEdit',
        beforeEnter: [isAdmin],
        component: () => import('@/views/OrderEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
