import type { RouteRecordRaw } from 'vue-router';
import { isAuth } from '@/middlewares/authentications.ts';

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
    }
] as RouteRecordRaw[];
