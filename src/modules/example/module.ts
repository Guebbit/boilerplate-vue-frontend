/**
 * @module
 * In any module: the manifest is the one file the application loads directly. It wires the domain's
 * routes, navigation entry, response schemas and locale loaders into the registry, and declares the
 * keys its stores report loading under.
 * Here: a small domain to copy, with no backend rules of its own to guard.
 * Instead see: `cart` for a barrel, `wishlist` for a slot contribution.
 * See: docs/theory/modules.md#the-module-template
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
 * It is in the `example` group of `scripts/module-groups.ts`, so `npm run demo:remove` deletes it with the shop: copy it first.
 *
 * Subdomain: none. It is the template a domain is copied from, not a subdomain.
 *
 * It sits on no context-map edge: `docs/modules/index.md` § "The whole map".
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
            section: 'admin',
            icon: NotebookPen
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.exampleResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
