/**
 * @module
 * Route table for the admin domain — one entry, gated by `meta.access`, lazy-loaded so the
 * dashboard bundle only loads when an admin actually navigates there.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Admin routes: the single observability dashboard, access-gated to the `admin` role.
 */
export default [
    {
        path: 'admin',
        name: 'Admin',
        meta: { access: 'admin', title: 'admin-page.page-title' },
        component: () => import('@/modules/admin/views/Admin.vue')
    }
] as RouteRecordRaw[];
