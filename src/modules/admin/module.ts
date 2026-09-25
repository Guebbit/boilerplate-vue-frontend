/**
 * @module
 * Module manifest for the admin domain — the shape every domain registers under
 * `AppModule`: routes, nav entry, response-schema validation and locale loaders, assembled from
 * this module's own files and wired into the kernel's registry.
 */
import { LayoutDashboard, ScrollText } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { adminResponseSchemas } from './response-schemas';

/**
 * The admin observability console (service health, KPIs, the platform's own audit log) plus the
 * shop's own audit trail — two different nav entries because they are two different rules: the
 * console is platform-`operator`-only, the trail is `audit.any.read`
 * (`manager`/`support`/`moderator`/`admin`), so `canAccess` shows each to a different audience.
 *
 * An ops console over endpoints the server already exposes, interchangeable with any
 * off-the-shelf dashboard.
 *
 * Depends on nothing. It reads the observability endpoints directly rather than any other
 * domain's store, so dropping it costs nothing anywhere else — which is the point, since it is
 * the first thing a downstream project without an ops dashboard deletes.
 */
export default {
    name: 'admin',
    routes,
    navigation: [
        {
            name: 'Admin',
            label: 'navigation.label-admin',
            plural: 1,
            order: 40,
            section: 'admin',
            icon: LayoutDashboard
        },
        {
            name: 'AuditLog',
            label: 'navigation.label-audit-log',
            plural: 1,
            order: 41,
            section: 'admin',
            icon: ScrollText
        }
    ],
    responseSchemas: adminResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
