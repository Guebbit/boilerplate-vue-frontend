import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'admin',
        name: 'Admin',
        meta: { access: 'admin', title: 'admin-page.page-title' },
        component: () => import('@/modules/admin/views/Admin.vue')
    }
] as RouteRecordRaw[];
