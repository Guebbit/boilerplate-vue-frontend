/**
 * @module
 * Declares the payments module manifest: the staff payments page, plus the response schemas and
 * locale loaders the app registry needs to wire the panel in.
 */
import { Landmark } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The payment behind an order — a panel — and the staff's page over every payment.
 *
 * Paying happens ON the order, so this module contributes the `PaymentPanel` component (through
 * its barrel) and the orders module mounts it — that arrow is orders → payments, declared there.
 * The staff page is the other direction's problem: its "Awaiting transfer" tab reads orders, so it
 * is a slot (`payments-awaiting-transfer`) that `orders` fills, and this module imports nothing
 * from it. Deleting this module removes the panel, the pay flow and the page in one `rm -rf` plus
 * one registry line, and orders go back to being paid nowhere.
 *
 * Taking money is not this shop’s differentiator, and the provider is the API's business.
 * What stays here is a panel that belongs to an order.
 */
export default {
    name: 'payments',
    loadingKeys: ['payments'],
    routes,
    navigation: [
        {
            name: 'PaymentsList',
            label: 'navigation.label-payments',
            plural: 1,
            order: 56,
            section: 'admin',
            group: 'navigation.group-sales',
            icon: Landmark
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.paymentsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
