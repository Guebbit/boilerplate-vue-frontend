import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { inventoryResponseSchemas } from './response-schemas';

/**
 * The stock ledger, admin-side.
 *
 * `dependsOn: ['products']` because the page names products (the receipt select, the title
 * lookup) through the products barrel — the same one-way arrow the BE's inventory module has.
 * Deleting this module removes the board and the ledger behind it; every shelf count stays
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
        'Inventory level':
            'What is on the shelf for one product right now: on hand, reserved, and the difference a shopper can actually buy.',
        Receipt:
            'Stock arriving. Raises what is on hand and nothing else, so a delivery is sellable the moment it lands.',
        Adjustment:
            'A stocktake correction, signed — shrinkage is the common case and it is negative. Refused when it would leave fewer units than are already promised to orders.'
    },
    routes,
    dependsOn: [
        {
            module: 'products',
            as: 'conformist',
            because:
                'Reads `useProductsStore` as it is, to name products in the receipt select and the ledger titles.'
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
