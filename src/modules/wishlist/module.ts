import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { wishlistResponseSchemas } from './response-schemas';

/**
 * The visitor's saved products.
 *
 * `dependsOn: ['cart']` is the move-to-cart exit: the store refreshes the cart it just wrote
 * into through the cart barrel, so the header's badge cannot lag a write this module initiated.
 * The reverse arrow does not exist — the cart never reads the wishlist — which is what keeps
 * `products → wishlist → cart → orders` a line rather than a loop.
 */
export default {
    name: 'wishlist',
    /*
     * A saved list with one exit into the cart. Deleting it costs a convenience, not a capability.
     */
    subdomain: 'supporting',
    routes,
    dependsOn: [
        {
            module: 'cart',
            as: 'customer-supplier',
            because:
                'Move-to-cart asks the cart store to write a line, then refreshes it so the header badge cannot lag.'
        }
    ],
    navigation: [{ name: 'Wishlist', label: 'navigation.label-wishlist', plural: 1, order: 75 }],
    responseSchemas: wishlistResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
