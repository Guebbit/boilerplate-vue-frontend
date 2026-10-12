/**
 * @module
 * Module manifest for the stats domain: routes, response schemas and locale loaders, assembled
 * from this module's own files and wired into the kernel's registry.
 */
import { ChartNoAxesCombined } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The shop's sales numbers, read-only, for the people who run it.
 *
 * Depends on no sibling module: every figure is one backend read, and the only links out (a
 * product's orders, a payment) are resolved by route name, so a build without `orders` simply
 * renders them as plain text. Deleting this module removes the dashboard and the product sales
 * page; no number anywhere else changes, because none is computed here.
 *
 * Reporting, not selling: it explains what the shop did, and owns none of the data.
 */
export default {
    name: 'stats',
    loadingKeys: ['stats'],
    routes,
    navigation: [
        {
            name: 'StatsDashboard',
            label: 'navigation.label-stats',
            plural: 1,
            order: 57,
            group: 'navigation.group-sales',
            section: 'admin',
            icon: ChartNoAxesCombined
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.statsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
