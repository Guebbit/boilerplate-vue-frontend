/**
 * @module
 * Route table for the admin domain, each entry gated by `meta.access`/`meta.can` and lazy-loaded
 * so a bundle only loads once a visitor with the rule for it actually navigates there.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Admin routes: the platform-`operator`-only observability dashboard, and the shop's own audit
 * trail — held by a genuinely different, tenant-scoped rule, see `AuditLog.vue`.
 */
export default [
    {
        path: 'admin',
        name: 'Admin',
        meta: {
            access: 'auth',
            can: ['read', 'ObservabilitySnapshot'],
            title: 'admin-page.page-title'
        },
        component: () => import('@/modules/admin/views/Admin.vue')
    },
    {
        path: 'audit',
        name: 'AuditLog',
        meta: {
            access: 'auth',
            can: ['read', 'AuditLog'],
            title: 'audit-log-page.page-title',
            // The rendered title carries a scoped record's own id when `?target=` is set — richer
            // than the static key above, which `document.title` still uses. AuditLog.vue renders
            // its own `PageHeader` for it.
            customHero: true
        },
        component: () => import('@/modules/admin/views/AuditLog.vue')
    }
] satisfies RouteRecordRaw[];
