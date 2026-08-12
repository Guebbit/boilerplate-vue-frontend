import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'admin',
        name: 'Admin',
        meta: { access: 'admin' },
        component: () => import('@/modules/admin/views/Admin.vue')
    }
] as RouteRecordRaw[];
