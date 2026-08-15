import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { inventoryResponseSchemas } from './responseSchemas';

/**
 * The stock ledger, admin-side.
 *
 * `dependsOn: ['products']` because the page names products (the restock select, the title
 * lookup) through the products barrel — the same one-way arrow the BE's inventory module has.
 * Deleting this module removes the ledger page and its nav entry; every shelf count stays
 * correct, every WHY goes unrecorded.
 */
export default {
    name: 'inventory',
    /*
     * A ledger that explains stock without owning it — specific to running a shop, not the reason
     * anyone shops here.
     */
    subdomain: 'supporting',
    language: {
        'Stock movement':
            'One row explaining a change in stock: how many, and why. Written by the server, listed here.',
        Restock:
            'The one movement this page originates. It still goes through the API like any other.'
    },
    routes,
    dependsOn: [
        {
            module: 'products',
            as: 'conformist',
            because:
                'Reads `useProductsStore` as it is, to name products in the restock select and the ledger titles.'
        }
    ],
    navigation: [
        { name: 'InventoryLedger', label: 'navigation.label-inventory', plural: 1, order: 47 }
    ],
    responseSchemas: inventoryResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerInventoryMockHandlers }) =>
                      registerInventoryMockHandlers()
                  )
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
