import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'products',
        name: 'ProductsList',
        component: () => import('@/features/products/views/ProductsList.vue')
    },
    {
        path: 'products/:id',
        name: 'ProductTarget',
        component: () => import('@/features/products/views/Product.vue'),
        props: true
    },
    {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        beforeEnter: [isAdmin],
        component: () => import('@/features/products/views/ProductEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
