/**
 * @module
 * Module manifest: wires the returns routes, nav entry, response schemas and locale loaders into
 * the app's module registry.
 */
import { Undo2 } from 'lucide-vue-next';
import { useUnreadNoticeCount } from '@/kernel/inbox-notices';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * Returns: the customer's own returns, the staff queue that approves and receives them, and the
 * EU withdrawal button.
 *
 * A return is its own object beside the order — the withdrawal button is its create call, not a
 * separate endpoint. The order page mounts this module's `WithdrawalPanel`; a return links back to
 * its order by route name.
 *
 * Context map: `docs/modules/returns.md` § "The map".
 *
 * Subdomain: `supporting`.
 */
export default {
    name: 'returns',
    loadingKeys: ['returns'],
    routes,
    navigation: [
        {
            name: 'ReturnsList',
            label: 'navigation.label-returns',
            plural: 1,
            order: 92,
            section: 'account',
            icon: Undo2
        },
        {
            name: 'SalesReturns',
            label: 'navigation.label-sales-returns',
            plural: 1,
            order: 59,
            section: 'admin',
            group: 'navigation.group-sales',
            icon: Undo2,
            // Unread work notices that point at this screen.
            badge: () =>
                useUnreadNoticeCount([
                    'notifications.staff.return-requested',
                    'notifications.staff.withdrawals-awaiting-goods',
                    'notifications.staff.returns-undecided'
                ])
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.returnsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
