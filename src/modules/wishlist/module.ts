import { Heart } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { wishlistResponseSchemas } from './response-schemas';

/**
 * The visitor's saved products.
 *
 * The one edge is the move-to-cart exit: the move is a WISHLIST endpoint, and the cart store is
 * then asked to refetch itself so the header's badge cannot lag a write this module initiated.
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
            as: 'conformist',
            because:
                'Move-to-cart calls a wishlist endpoint and then asks the cart store to refetch itself; the cart is never asked to write.'
        }
    ],
    navigation: [
        {
            name: 'Wishlist',
            label: 'navigation.label-wishlist',
            plural: 1,
            order: 75,
            section: 'account',
            icon: Heart
        }
    ],
    responseSchemas: wishlistResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
