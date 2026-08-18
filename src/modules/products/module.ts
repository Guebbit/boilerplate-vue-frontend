import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { productsResponseSchemas } from './responseSchemas';

/**
 * The product catalogue: a public list and detail, plus admin create and edit.
 *
 * Depends on nothing. The cart reads the catalogue, not the other way round.
 */
export default {
    name: 'products',
    /*
     * What a shop sells is the shop, and the catalogue is the screen a visitor spends their time
     * on. The client half owns the browsing experience; the server owns the prices.
     */
    subdomain: 'core',
    language: {
        Product: 'A sellable item as the API returns it. Identified by id; the name is not unique.',
        Catalogue:
            'The list view, with its filters and paging. The filters are query parameters — the server does the filtering.',
        Stock: 'Units on the shelf, read from the response. This client displays availability and never decides it.'
    },
    routes,
    /*
     * Storefront arrows, both pointing away from the catalogue page the visitor is on: the
     * product page WRITES a cart line ("add to cart") and a wishlist line (the heart), through
     * each module's barrel. Neither of those modules reads the catalogue back through code —
     * their fixtures name it in `mockSeeds.after`, which is a data statement, not this one.
     */
    dependsOn: [
        {
            module: 'cart',
            as: 'customer-supplier',
            because: 'Add-to-cart asks the cart store to write a line.'
        },
        {
            module: 'wishlist',
            as: 'customer-supplier',
            because: 'The heart asks the wishlist store to save the product.'
        }
    ],
    navigation: [
        { name: 'ProductsList', label: 'navigation.label-products-list', plural: 2, order: 60 }
    ],
    responseSchemas: productsResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerProductsMockHandlers }) =>
                      registerProductsMockHandlers()
                  )
            : undefined,
    // The data those handlers answer with. Same inline-ternary rule as above, for the same reason:
    // the fixtures must not reach a production bundle. Names no `after` — the catalogue is the root
    // of the fixture graph.
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  build: () =>
                      import('./mocks/register').then(({ buildProductsMockSeeds }) =>
                          buildProductsMockSeeds()
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
