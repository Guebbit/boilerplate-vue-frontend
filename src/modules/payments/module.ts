import type { AppModule } from '@/kernel/registry';
import { paymentsResponseSchemas } from './response-schemas';

/**
 * The payment behind an order — a panel, not a page.
 *
 * No routes and no navigation: paying happens ON the order, so this module contributes the
 * `PaymentPanel` component (through its barrel) and the orders module mounts it — that arrow is
 * orders → payments, declared there. Deleting this module removes the panel and the pay flow in
 * one `rm -rf` plus one registry line, and orders go back to being paid nowhere.
 */
export default {
    name: 'payments',
    /*
     * Taking money is not this shop’s differentiator, and the provider is the API's business.
     * What stays here is a panel that belongs to an order.
     */
    routes: [],
    responseSchemas: paymentsResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
