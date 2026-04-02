import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'products',
        name: 'ProductsList',
        component: () => import('@/views/ProductsList.vue')
    },
    {
        path: 'products/:id',
        name: 'ProductTarget',
        component: () => import('@/views/Product.vue'),
        props: true
    },
    {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        beforeEnter: [isAdmin],
        component: () => import('@/views/ProductEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
