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
    language: {
        Order: 'What a customer bought, frozen. This client renders it and never edits its substance — only an admin moves its status.',
        Status: 'Where an order is in its lifecycle. A closed set the server enforces; this module maps each value to a label and a colour.',
        Reorder:
            'Refilling the cart from a past order. The one write this module makes into another module’s state.'
    },
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
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerOrdersMockHandlers }) =>
                      registerOrdersMockHandlers()
                  )
            : undefined,
    /*
     * The data those handlers answer with. Same inline-ternary rule as above, for the same reason:
     * the fixtures must not reach a production bundle.
     *
     * `after` names two modules while this manifest declares no `dependsOn` at all, and both are
     * correct: the orders CODE imports nothing (the arrow runs the other way, see above), while an
     * order's DATA embeds a product snapshot and carries its owner's id and email. Fixtures and
     * imports are different graphs; see `AppModule.mockSeeds`.
     */
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  after: ['products', 'users'],
                  build: () =>
                      import('./mocks/register').then(({ buildOrdersMockSeeds }) =>
                          buildOrdersMockSeeds()
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
