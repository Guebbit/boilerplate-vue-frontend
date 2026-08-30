/**
 * @module
 * Module manifest for the admin domain — the shape every domain registers under
 * `AppModule`: routes, nav entry, response-schema validation and locale loaders, assembled from
 * this module's own files and wired into the kernel's registry.
 */
import { LayoutDashboard } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { adminResponseSchemas } from './response-schemas';

/**
 * The admin observability console: service health, KPIs and the audit log.
 *
 * Depends on nothing. It reads the observability endpoints directly rather than any other
 * domain's store, so dropping it costs nothing anywhere else — which is the point, since it is
 * the first thing a downstream project without an ops dashboard deletes.
 */
export default {
    name: 'admin',
    /*
     * An ops console over endpoints the server already exposes. Interchangeable with any
     * off-the-shelf dashboard, and the first thing a downstream project without ops deletes.
     */
    routes,
    navigation: [
        {
            name: 'Admin',
            label: 'navigation.label-admin',
            plural: 1,
            order: 40,
            section: 'admin',
            icon: LayoutDashboard
        }
    ],
    responseSchemas: adminResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
