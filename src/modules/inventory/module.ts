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
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
