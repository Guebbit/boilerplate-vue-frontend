import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'products',
        name: 'ProductsList',
        component: () => import('./views/ProductsList.vue')
    },
    {
        // Declared before `products/:id` so the intent is obvious at a glance. vue-router ranks
        // a static segment above a dynamic one regardless of order, so `create` could not be
        // swallowed as an id either way — but the users routes read the same way, and a reader
        // should not have to know the ranking rules to be sure.
        path: 'products/create',
        name: 'ProductCreate',
        beforeEnter: [isAdmin],
        component: () => import('./views/ProductCreate.vue')
    },
    {
        path: 'products/:id',
        name: 'ProductTarget',
        component: () => import('./views/Product.vue'),
        props: true
    },
    {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        beforeEnter: [isAdmin],
        component: () => import('./views/ProductEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
