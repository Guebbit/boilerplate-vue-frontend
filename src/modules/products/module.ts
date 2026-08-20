import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { productsResponseSchemas } from './response-schemas';

/**
 * The product catalogue: a public list and detail, plus admin create and edit.
 *
 * Depends on nothing. The cart reads the catalogue, not the other way round.
 */
export default {
    name: 'products',
    /*
     * What a shop sells is the shop, and the catalogue is the screen a visitor spends their time
     * on. The client half owns the browsing experience; the server owns the prices.
     */
    subdomain: 'core',
    routes,
    /*
     * Storefront arrows, both pointing away from the catalogue page the visitor is on: the
     * product page WRITES a cart line ("add to cart") and a wishlist line (the heart), through
     * each module's barrel. Neither of those modules reads the catalogue back through code, which
     * is why the arrows point one way only.
     */
    dependsOn: [
        {
            module: 'cart',
            as: 'customer-supplier',
            because: 'Add-to-cart asks the cart store to write a line.'
        },
        {
            module: 'wishlist',
            as: 'customer-supplier',
            because: 'The heart asks the wishlist store to save the product.'
        }
    ],
    navigation: [
        { name: 'ProductsList', label: 'navigation.label-products-list', plural: 2, order: 60 }
    ],
    responseSchemas: productsResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
