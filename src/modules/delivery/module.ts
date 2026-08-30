/**
 * @module
 * App-module manifest: a plain object satisfying `AppModule`, registering this module's
 * response schemas and locale loaders. No routes — see the doc on the default export for why.
 */

import type { AppModule } from '@/kernel/registry';
import { deliveryResponseSchemas } from './response-schemas';

/**
 * Shipping methods and shipments — components, not pages.
 *
 * No routes and no navigation: the selector lives on the cart, the parcel panel on the order,
 * both mounted by their owners through this module's barrel (cart → delivery, orders →
 * delivery). Deleting this module removes the selector and the panels, and checkouts simply stop
 * carrying shipping.
 */
export default {
    name: 'delivery',
    /*
     * Shipping is specific to how this shop operates but is not what anyone buys. Two components
     * and a store — supporting, and deliberately page-less.
     */
    routes: [],
    responseSchemas: deliveryResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
