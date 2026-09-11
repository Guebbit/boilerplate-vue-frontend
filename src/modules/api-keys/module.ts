/**
 * @module
 * Module manifest: wires the api-keys routes, nav entry, response schemas and locale loaders
 * into the app's module registry.
 */
import { KeyRound } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { apiKeysResponseSchemas } from './response-schemas';

/**
 * Machine-to-machine credential management: minting and revoking `sk_...` keys a caller uses in
 * place of a session.
 *
 * Depends on nothing. Only `owner` holds `apikeys.*` today (through `all.manage`), so the nav
 * entry and both routes disappear for anyone else — `meta.can` is evaluated against the server's
 * published rules, not a role name.
 */
export default {
    name: 'api-keys',
    routes,
    navigation: [
        {
            name: 'ApiKeysList',
            label: 'navigation.label-api-keys',
            plural: 2,
            order: 51,
            section: 'admin',
            icon: KeyRound
        }
    ],
    responseSchemas: apiKeysResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
