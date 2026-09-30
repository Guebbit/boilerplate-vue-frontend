/**
 * @module
 * Module manifest: wires this domain's routes, navigation entry, response schemas and locale
 * loaders into the app's module registry.
 */
import { Package } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The product catalogue: a public list and detail, plus admin create and edit.
 *
 * Storefront buttons arrive by contribution, not import: the product page hosts a
 * `product-actions` slot, and `cart` and `wishlist` each put their button into it from their own
 * manifests. `cart` and `wishlist` read the catalogue back through this module's barrel
 * (`useProductLines`), which is why the arrows point at `products` and none point out of it.
 *
 * What a shop sells is the shop, and the catalogue is the screen a visitor spends their time
 * on. The client half owns the browsing experience; the server owns the prices.
 */
export default {
    name: 'products',
    loadingKeys: ['products'],
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
    responseSchemas: () => import('./response-schemas').then((m) => m.productsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The dictionary is keyed by product id alone, and every cached record's title/description
    // is resolved server-side in whatever language the request carried, so a language switch has
    // to wipe it. A dynamic `import('./store')` rather than a top-level one: this manifest is
    // evaluated eagerly for every enabled module, and a static import would pull the whole
    // store into that same eager chunk for a callback that only fires after a real switch.
    // Returned, not `void`-ed: the locale guard awaits this so a page it lets through never
    // renders off a cache the reset hasn't reached yet.
    resetOnLocaleChange: () =>
        import('./store').then(({ useProductsStore }) => useProductsStore().resetForLocaleChange())
} satisfies AppModule;
