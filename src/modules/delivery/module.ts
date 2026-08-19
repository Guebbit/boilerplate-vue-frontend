import type { AppModule } from '@/kernel/registry';
import { deliveryResponseSchemas } from './response-schemas';

/**
 * Shipping methods, shipments and the fake courier — components, not pages.
 *
 * No routes and no navigation: the selector lives on the cart, the parcel panel on the order,
 * both mounted by their owners through this module's barrel (cart → delivery, orders →
 * delivery). Deleting this module removes the selector, the panels and the mock courier, and
 * checkouts simply stop carrying shipping — the state the shop was in before.
 */
export default {
    name: 'delivery',
    /*
     * Shipping is specific to how this shop operates but is not what anyone buys. Two components
     * and a store — supporting, and deliberately page-less.
     */
    subdomain: 'supporting',
    language: {
        'Shipping method':
            'A named way to ship, with a price the server quotes. Chosen in the cart, frozen on the order.',
        Shipment:
            'The parcel panel on an order that has shipped. Read-only here — the courier is faked server-side.'
    },
    routes: [],
    responseSchemas: deliveryResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
