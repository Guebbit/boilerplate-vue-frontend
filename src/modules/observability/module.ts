/**
 * @module
 * Module manifest for the observability domain — the shape every domain registers under
 * `AppModule`: routes, nav entries, response-schema validation and locale loaders, assembled from
 * this module's own files and wired into the kernel's registry.
 */
import { LayoutDashboard, Radio, ScrollText } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The admin observability console (service health, KPIs, the platform's own audit log), the
 * shop's own audit trail, and the realtime SSE playground over the same metrics stream — three
 * nav entries because they are three different screens over one backend pairing: the console and
 * the playground are platform-`operator`-only, the trail is `audit.any.read`
 * (`manager`/`support`/`moderator`/`admin`), so `canAccess` shows each to a different audience.
 *
 * An ops console (plus a live feed) over endpoints the server already exposes, interchangeable
 * with any off-the-shelf dashboard.
 *
 * Depends on nothing. It reads the observability endpoints directly rather than any other
 * domain's store, so dropping it costs nothing anywhere else — which is the point, since it is
 * the first thing a downstream project without an ops dashboard deletes.
 */
export default {
    name: 'observability',
    routes,
    navigation: [
        {
            name: 'RealtimePlayground',
            label: 'navigation.label-realtime',
            plural: 1,
            order: 30,
            section: 'admin',
            icon: Radio
        },
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
    responseSchemas: () => import('./response-schemas').then((m) => m.adminResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
