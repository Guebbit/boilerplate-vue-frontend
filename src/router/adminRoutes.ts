import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'admin',
        name: 'Admin',
        beforeEnter: [isAdmin],
        component: () => import('@/views/admin/Admin.vue')
    }
] as RouteRecordRaw[];
