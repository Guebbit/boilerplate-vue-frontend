import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { wishlistResponseSchemas } from './responseSchemas';

/**
 * The visitor's saved products.
 *
 * `dependsOn: ['cart']` is the move-to-cart exit: the store refreshes the cart it just wrote
 * into through the cart barrel, so the header's badge cannot lag a write this module initiated.
 * The reverse arrow does not exist — the cart never reads the wishlist — which is what keeps
 * `products → wishlist → cart → orders` a line rather than a loop.
 */
export default {
    name: 'wishlist',
    routes,
    dependsOn: ['cart'],
    navigation: [{ name: 'Wishlist', label: 'navigation.label-wishlist', plural: 1, order: 75 }],
    responseSchemas: wishlistResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerWishlistMockHandlers }) =>
                      registerWishlistMockHandlers()
                  )
            : undefined,
    /*
     * Same inline-ternary rule as `mockHandlers`: the fixtures must not reach a production
     * bundle. `after: ['users', 'products']` is about data, not code — a saved line names a
     * user and a product, so the random profile cannot draw one before both exist.
     */
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  after: ['users', 'products'],
                  build: (context) =>
                      import('./mocks/seeds').then(({ buildWishlistMockSeeds }) =>
                          buildWishlistMockSeeds(context)
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
