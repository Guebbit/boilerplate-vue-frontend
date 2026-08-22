import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'wishlist',
        name: 'Wishlist',
        meta: { access: 'auth', title: 'wishlist-page.page-title' },
        component: () => import('@/modules/wishlist/views/Wishlist.vue')
    }
] as RouteRecordRaw[];
