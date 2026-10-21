/**
 * @module
 * Module manifest: wires the orders routes, nav entry, response schemas and
 * locale loaders into the app's module registry.
 */
import { ClipboardList, ReceiptText } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * Orders: a customer's own order history, and the admin screens that edit an order's status.
 *
 * The customer's history, the staff's own page over the same list (`SalesOrders`), the payments
 * admin status screens. Where the shop's outcome becomes visible — but the invariants that decide a
 * status live behind the API, not here.
 *
 * Context map: `docs/modules/orders.md` § "The map".
 */
export default {
    name: 'orders',
    loadingKeys: ['orders'],
    routes,
    navigation: [
        {
            name: 'OrdersList',
            label: 'navigation.label-orders',
            plural: 1,
            order: 90,
            section: 'account',
            icon: ReceiptText
        },
        {
            name: 'SalesOrders',
            label: 'navigation.label-sales-orders',
            plural: 1,
            order: 55,
            section: 'admin',
            group: 'navigation.group-sales',
            icon: ClipboardList
        }
    ],
    tours: [
        {
            tour: 'order-staff',
            id: 'payment',
            target: 'order-payment',
            title: 'order-tour.payment-title',
            body: 'order-tour.payment-body',
            order: 10
        },
        {
            tour: 'order-staff',
            id: 'shipment',
            target: 'order-shipment',
            title: 'order-tour.shipment-title',
            body: 'order-tour.shipment-body',
            order: 20
        },
        {
            tour: 'order-staff',
            id: 'timeline',
            target: 'order-timeline',
            title: 'order-tour.timeline-title',
            body: 'order-tour.timeline-body',
            order: 30
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.ordersResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
