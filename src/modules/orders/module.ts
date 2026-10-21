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
 * Reaches into `cart` for the reorder button — `Order.vue` refills the visitor's cart through the
 * cart barrel, a `customer-supplier` call. The server-side arrow runs the other way (checkout
 * creates an order), but a module's imports are what it depends on, and the import here is
 * order-page → cart store. `delivery` is `published-language`, the cheapest kind: `Order.vue`
 * mounts `ShipmentPanel` and `ShippingMethodName`, self-contained components that render a parcel
 * and a method's name without this module ever touching a shipment. `payments` is
 * `customer-supplier`, by one import: `OrderEdit.vue` refunds through `useOrderRefund`, a call that
 * makes the payments store do something. The rest of that edge is components — `PaymentPanel` on
 * the order page, `RecordOfflinePaymentForm` on the edit page, `OrderReferenceSearch` on the list,
 * whose RF-reference lookup and the 404 it has to read are the component's own business, so this
 * module gains no edge to that endpoint. The withdrawal
 * button is the same shape again: `Order.vue` mounts `returns`' `WithdrawalPanel`, which owns the
 * confirmation and the order's returns list, so `orders` never calls a returns operation itself.
 * `Order.vue` also mounts `delivery`'s `ShippingMethodName` on the same terms. The one exception is
 * `OrderEdit.vue`'s `useOrderRefund`, a `payments` composable that performs a refund: a
 * `customer-supplier` edge.
 *
 * The customer’s history, the staff's own page over the same list (`SalesOrders`), the payments
 * admin status screens. Where the shop’s outcome becomes visible — but the invariants that decide a
 * status live behind the API, not here.
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
