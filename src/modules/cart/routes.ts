import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'cart',
        name: 'Cart',
        meta: { access: 'auth', title: 'cart-page.page-title' },
        component: () => import('@/modules/cart/views/Cart.vue')
    }
] as RouteRecordRaw[];
