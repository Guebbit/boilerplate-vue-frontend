import type { IAppModule } from '@/kernel/registry';
import routes from './routes';
import { ordersResponseSchemas } from './responseSchemas';

/**
 * Orders: a customer's own order history, and the admin screens that edit an order's status.
 *
 * Depends on nothing. The arrow runs the other way — the cart's checkout creates an order — which
 * is why `cart` declares `dependsOn: ['orders']` and this module names no one.
 */
export default {
    name: 'orders',
    routes,
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
     * imports are different graphs; see `IAppModule.mockSeeds`.
     */
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  after: ['products', 'users'],
                  build: (context) =>
                      import('./mocks/seeds').then(({ buildOrdersMockSeeds }) =>
                          buildOrdersMockSeeds(context)
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies IAppModule;
