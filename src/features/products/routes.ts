import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'products',
        name: 'ProductsList',
        component: () => import('@/features/products/views/ProductsList.vue')
    },
    {
        // Declared before `products/:id` so the intent is obvious at a glance. vue-router ranks
        // a static segment above a dynamic one regardless of order, so `create` could not be
        // swallowed as an id either way — but the users routes read the same way, and a reader
        // should not have to know the ranking rules to be sure.
        path: 'products/create',
        name: 'ProductCreate',
        meta: { access: 'admin' },
        component: () => import('@/features/products/views/ProductCreate.vue')
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
        meta: { access: 'admin' },
        component: () => import('@/features/products/views/ProductEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
