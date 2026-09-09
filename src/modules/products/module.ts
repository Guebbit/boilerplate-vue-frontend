/**
 * @module
 * Module manifest: wires this domain's routes, navigation entry, response schemas and locale
 * loaders into the app's module registry.
 */
import { Package } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { productsResponseSchemas } from './response-schemas';
import { useProductsStore } from './store';

/**
 * The product catalogue: a public list and detail, plus admin create and edit.
 *
 * Storefront arrows, both pointing away from the catalogue page the visitor is on: the product page
 * WRITES a cart line ("add to cart") and a wishlist line (the heart), through each module's barrel —
 * both `customer-supplier`, asking the sibling's store to write. The cart and the wishlist read the
 * catalogue back only through the server, not through code, which is why the arrows point one way
 * only.
 *
 * What a shop sells is the shop, and the catalogue is the screen a visitor spends their time
 * on. The client half owns the browsing experience; the server owns the prices.
 */
export default {
    name: 'products',
    routes,
    navigation: [
        {
            name: 'ProductsList',
            label: 'navigation.label-products-list',
            plural: 2,
            order: 60,
            section: 'main',
            icon: Package
        }
    ],
    responseSchemas: productsResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The dictionary is keyed by product id alone, and every cached record's title/description
    // is resolved server-side in whatever language the request carried, so a language switch has
    // to wipe it. `useProductsStore()` is called INSIDE the callback, never at module scope,
    // since Pinia is not installed yet when this manifest is evaluated.
    localeSensitive: true,
    resetOnLocaleChange: () => useProductsStore().resetAll()
} satisfies AppModule;
