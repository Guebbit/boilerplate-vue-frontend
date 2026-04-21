import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'products',
        name: 'ProductsList',
        component: () => import('@/views/products/ProductsList.vue')
    },
    {
        path: 'products/:id',
        name: 'ProductTarget',
        component: () => import('@/views/products/Product.vue'),
        props: true
    },
    {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        beforeEnter: [isAdmin],
        component: () => import('@/views/products/ProductEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
