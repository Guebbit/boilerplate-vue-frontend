import { ReceiptText } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { ordersResponseSchemas } from './response-schemas';

/**
 * Orders: a customer's own order history, and the admin screens that edit an order's status.
 *
 * Reaches into `cart` for the reorder button — `Order.vue` refills the visitor's cart through the
 * cart barrel, a `customer-supplier` call. The server-side arrow runs the other way (checkout
 * creates an order), but a module's imports are what it depends on, and the import here is
 * order-page → cart store. Two more edges are `published-language`, the cheapest kind: it mounts
 * `ShipmentPanel` and `PaymentPanel`, self-contained components that render a parcel and a payment
 * without this module ever touching a shipment or a provider.
 */
export default {
    name: 'orders',
    /*
     * The customer’s history and the admin status screens. Where the shop’s outcome becomes
     * visible — but the invariants that decide a status live behind the API, not here.
     */
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
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
