/**
 * @module
 * Module manifest: wires the orders routes, nav entry, response schemas and
 * locale loaders into the app's module registry.
 */
import { ReceiptText } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { ordersResponseSchemas } from './response-schemas';
import { useOrdersStore } from './store';

/**
 * Orders: a customer's own order history, and the admin screens that edit an order's status.
 *
 * Reaches into `cart` for the reorder button — `Order.vue` refills the visitor's cart through the
 * cart barrel, a `customer-supplier` call. The server-side arrow runs the other way (checkout
 * creates an order), but a module's imports are what it depends on, and the import here is
 * order-page → cart store. Two more edges are `published-language`, the cheapest kind: it mounts
 * `ShipmentPanel` and `PaymentPanel`, self-contained components that render a parcel and a payment
 * without this module ever touching a shipment or a provider.
 *
 * The customer’s history and the admin status screens. Where the shop’s outcome becomes
 * visible — but the invariants that decide a status live behind the API, not here.
 */
export default {
    name: 'orders',
    routes,
    navigation: [
        {
            name: 'OrdersList',
            label: 'navigation.label-orders',
            plural: 1,
            order: 90,
            section: 'account',
            icon: ReceiptText
        }
    ],
    responseSchemas: ordersResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // Every cached order embeds its lines' resolved, language-dependent product text, so a
    // language switch has to wipe it. `useOrdersStore()` runs inside the callback, never at
    // module scope: Pinia is not installed yet when this manifest is evaluated.
    resetOnLocaleChange: () => useOrdersStore().resetAll()
} satisfies AppModule;
