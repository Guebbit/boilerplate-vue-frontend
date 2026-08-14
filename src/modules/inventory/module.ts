import type { IAppModule } from '@/kernel/registry';
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
    routes,
    dependsOn: ['products'],
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
} satisfies IAppModule;
