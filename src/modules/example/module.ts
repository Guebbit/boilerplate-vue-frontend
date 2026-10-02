/**
 * @module
 * The module manifest: the one file the application loads directly. It wires this domain's
 * routes, navigation entry, response schemas and locale loaders into the registry, and declares
 * the keys its stores report loading under. Every module has one; this one has no backend domain
 * of its own to guard, only a small one to copy.
 */
import { NotebookPen } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * What makes `logger.debug('example', …)` type-check. Deleting this folder takes the scope with it.
 */
declare module '@/infrastructure/utils/logger.ts' {
    // The name belongs to the module being augmented, not to this one: declaration merging only
    // works against the exact interface it declares.
    interface LogScopes {
        example: true;
    }
}

/**
 * The example domain: a small note with an owner and a draft, published, archived life — the
 * screens a new domain needs, kept small enough to read in one sitting. Copy this folder to start
 * a domain; delete it once you have your own.
 *
 * Depends on no sibling. The routes sit behind `meta.access` and `meta.can`, so the navigation
 * entry and every screen disappear for anyone the server's rules do not let in; the one public
 * route needs neither.
 *
 * It is not on `DEMO_MODULE_NAMES`, so `npm run demo:remove` leaves it in place.
 */
export default {
    name: 'example',
    loadingKeys: ['example'],
    routes,
    navigation: [
        {
            name: 'ExamplesList',
            label: 'navigation.label-examples',
            plural: 2,
            order: 20,
            section: 'main',
            icon: NotebookPen
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.exampleResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
