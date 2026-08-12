import type { IAppModule } from '@/kernel/registry';
import routes from './routes';
import { cartResponseSchemas } from './responseSchemas';

/**
 * The shopping cart, and the checkout that turns it into an order.
 *
 * `dependsOn: ['orders']` is the checkout: `Cart.vue` calls `useOrdersStore` through the orders
 * barrel, so a build that enables cart without orders is broken, and the registry now says so
 * while the router is assembled instead of on the navigation that first crosses the gap.
 *
 * Unlike the backend there is no reverse edge to break — the browser never cleans other users'
 * carts when a product disappears — so this stays a plain one-way dependency and needs no events.
 */
export default {
    name: 'cart',
    routes,
    dependsOn: ['orders'],
    navigation: [{ name: 'Cart', label: 'navigation.label-cart', plural: 1, order: 80 }],
    responseSchemas: cartResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerCartMockHandlers }) =>
                      registerCartMockHandlers()
                  )
            : undefined,
    /*
     * The data those handlers answer with. Same inline-ternary rule as above, for the same reason:
     * the fixtures must not reach a production bundle.
     *
     * `after: ['products']` is NOT the same statement as `dependsOn: ['orders']` above, and the two
     * lists differ on purpose: `dependsOn` is about code (`Cart.vue` calls `useOrdersStore`), while
     * `after` is about data — the random profile draws its cart items from the catalogue actually in
     * the database, so it cannot run before products has contributed one.
     */
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  after: ['products'],
                  build: (context) =>
                      import('./mocks/seeds').then(({ buildCartMockSeeds }) =>
                          buildCartMockSeeds(context)
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies IAppModule;
