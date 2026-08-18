import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { cartResponseSchemas } from './responseSchemas';

/**
 * The shopping cart, and the checkout that turns it into an order.
 *
 * Nearly every arrow points AT this module: orders reaches the cart barrel for the reorder button,
 * wishlist for its move-to-cart exit, products for "add to cart". All three are
 * `customer-supplier` — they ask this store to write a line — which is why the cart publishes a
 * store while the modules it depends on publish components and schemas.
 *
 * The one arrow going out is `delivery`, and it is `published-language`: the checkout mounts
 * `ShippingSelector` and never learns what a shipping rate is.
 */
export default {
    name: 'cart',
    /*
     * Checkout is the one screen where price, stock, address and shipping have to agree at once,
     * and the only place this client holds a multi-step flow of its own. Every other module points
     * at it.
     */
    subdomain: 'core',
    language: {
        Cart: 'A VIEW of the server’s cart, not a second copy of it. Every mutation is a request; the store holds the answer.',
        'Cart line':
            'A product and a quantity, as the API returns them. Prices come down with the response — this client never computes one.',
        Checkout:
            'The flow that turns the cart into an order: address, shipping, payment. The steps are this module’s; the rules are not.',
        Badge: 'The header’s item count. The reason siblings refresh this store after writing to it.'
    },
    dependsOn: [
        {
            module: 'delivery',
            as: 'published-language',
            because:
                'Mounts `ShippingSelector`, a self-contained component that renders shipping without this module learning what a rate is.'
        }
    ],
    routes,
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
     * `after: ['products']` is NOT the same statement as the `dependsOn` above, and the two lists
     * differ on purpose: `dependsOn` is about code (this module mounts delivery's selector), while
     * `after` is about data — a cart line points at a product, so the catalogue has to exist in
     * the database, so it cannot run before products has contributed one.
     */
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  after: ['products'],
                  build: () =>
                      import('./mocks/register').then(({ buildCartMockSeeds }) =>
                          buildCartMockSeeds()
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
