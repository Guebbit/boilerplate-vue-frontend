import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { ordersResponseSchemas } from './response-schemas';

/**
 * Orders: a customer's own order history, and the admin screens that edit an order's status.
 *
 * `dependsOn: ['cart']` is the reorder button: `Order.vue` refills the visitor's cart through
 * the cart barrel. The server-side arrow runs the other way (checkout creates an order), but a
 * manifest declares IMPORTS, and the import here is order-page → cart store.
 */
export default {
    name: 'orders',
    /*
     * The customer’s history and the admin status screens. Where the shop’s outcome becomes
     * visible — but the invariants that decide a status live behind the API, not here.
     */
    subdomain: 'core',
    routes,
    dependsOn: [
        {
            module: 'cart',
            as: 'customer-supplier',
            because: 'The reorder button asks the cart store to refill itself from a past order.'
        },
        {
            module: 'delivery',
            as: 'published-language',
            because:
                'Mounts `ShipmentPanel`; the parcel renders itself and this module never touches a shipment.'
        },
        {
            module: 'payments',
            as: 'published-language',
            because:
                'Mounts `PaymentPanel`; paying happens on the order page without this module knowing a provider exists.'
        }
    ],
    navigation: [{ name: 'OrdersList', label: 'navigation.label-orders', plural: 1, order: 90 }],
    responseSchemas: ordersResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
