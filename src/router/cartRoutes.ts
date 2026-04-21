import type { RouteRecordRaw } from 'vue-router';
import { isAuth } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'cart',
        name: 'Cart',
        beforeEnter: [isAuth],
        component: () => import('@/views/cart/Cart.vue')
    }
] as RouteRecordRaw[];
