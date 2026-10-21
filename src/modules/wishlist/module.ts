/**
 * @module
 * Wishlist module manifest. Declares the module's routes, nav entry, response
 * schemas and locale loaders for the app registry — see `AppModule`.
 */
import { defineAsyncComponent } from 'vue';
import { Heart } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The visitor's saved products.
 *
 * The product page's heart is contributed to the `product-actions` slot by this manifest, so
 * `products` never imports the wishlist.
 *
 * A saved list with one exit into the cart. Deleting it costs a convenience, not a capability.
 *
 * Context map: `docs/modules/wishlist.md` § "The map".
 */
export default {
    name: 'wishlist',
    loadingKeys: ['wishlist'],
    routes,
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
    responseSchemas: () => import('./response-schemas').then((m) => m.wishlistResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The product page's heart: lazy, so it does not join the eager entry chunk.
    slots: {
        'product-actions': [defineAsyncComponent(() => import('./components/WishlistToggle.vue'))]
    }
} satisfies AppModule;
