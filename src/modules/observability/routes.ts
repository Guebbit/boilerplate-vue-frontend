/**
 * @module
 * Route table for the observability domain: the platform-`operator`-only console (health, KPIs,
 * the platform's own audit log), the shop's own audit trail — held by a genuinely different,
 * tenant-scoped rule, see `AuditLog.vue` — and the realtime SSE playground over the same metrics
 * stream. Each entry gated by `meta.access`/`meta.can` and lazy-loaded so a bundle only loads once
 * a visitor with the rule for it actually navigates there.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the observability module, mounted under the app's module registry.
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
        component: () => import('@/modules/observability/views/Admin.vue')
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
        component: () => import('@/modules/observability/views/AuditLog.vue')
    },
    {
        path: 'playground/realtime',
        name: 'RealtimePlayground',
        meta: {
            access: 'auth',
            can: ['read', 'ObservabilitySnapshot'],
            title: 'realtime-playground-page.page-title'
        },
        component: () => import('@/modules/observability/views/RealtimePlayground.vue')
    }
] satisfies RouteRecordRaw[];
