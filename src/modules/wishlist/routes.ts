import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'wishlist',
        name: 'Wishlist',
        meta: { access: 'auth' },
        component: () => import('@/modules/wishlist/views/Wishlist.vue')
    }
] as RouteRecordRaw[];
