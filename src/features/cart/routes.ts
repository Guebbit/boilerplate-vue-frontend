import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'cart',
        name: 'Cart',
        meta: { access: 'auth' },
        component: () => import('@/features/cart/views/Cart.vue')
    }
] as RouteRecordRaw[];
