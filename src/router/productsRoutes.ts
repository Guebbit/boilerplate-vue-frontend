import type { RouteRecordRaw } from 'vue-router'

export default [
    {
        path: 'products',
        name: 'ProductsList',
        component: () => import('@/views/ProductsList.vue'),
    },
    {
        path: 'products/:id',
        name: 'ProductTarget',
        component: () => import('@/views/Product.vue'),
        props: true,
    },
] as RouteRecordRaw[]
