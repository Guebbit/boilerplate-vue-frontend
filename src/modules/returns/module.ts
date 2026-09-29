/**
 * @module
 * Module manifest: wires the returns routes, nav entry, response schemas and locale loaders into
 * the app's module registry.
 */
import { Undo2 } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * Returns: the customer's own returns, the staff queue that approves and receives them, and the
 * EU withdrawal button.
 *
 * Depends on nothing. The order page reaches this module (it mounts `WithdrawalPanel`, a
 * `published-language` edge declared on `orders`), never the other way: a return links back to its
 * order by route name, and the order's own money and status are read from the API's answers, not
 * from another store.
 *
 * A return is its own object beside the order — the withdrawal button is its create call, not a
 * separate endpoint.
 */
export default {
    name: 'returns',
    routes,
    navigation: [
        {
            name: 'ReturnsList',
            label: 'navigation.label-returns',
            plural: 1,
            order: 92,
            section: 'account',
            icon: Undo2
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.returnsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
