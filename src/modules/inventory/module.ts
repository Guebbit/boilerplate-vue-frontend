/**
 * @module
 * Module manifest for the inventory domain — the shape every domain registers under
 * `AppModule`: routes, nav entry, response-schema validation and locale loaders, assembled from
 * this module's own files and wired into the kernel's registry.
 */
import { defineAsyncComponent } from 'vue';
import { CalendarClock, Warehouse } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The stock ledger and the preorder board, admin-side.
 *
 * A recorded movement changes stock, so the stock-movement form asks `products` to drop its cached
 * catalogue (`invalidateProductsCache`); the preorder board mounts `delivery`'s second tab. Deleting
 * this module removes the boards and the ledger behind them; every shelf count stays correct, every
 * WHY goes unrecorded.
 *
 * A ledger that explains stock without owning it — specific to running a shop, not the reason
 * anyone shops here.
 *
 * Context map: `docs/modules/inventory.md` § "The map".
 */
export default {
    name: 'inventory',
    loadingKeys: ['inventory'],
    routes,
    navigation: [
        {
            name: 'InventoryLedger',
            label: 'navigation.label-inventory',
            plural: 1,
            order: 47,
            section: 'admin',
            icon: Warehouse
        },
        {
            name: 'PreordersBoard',
            label: 'navigation.label-preorders',
            plural: 1,
            order: 58,
            section: 'admin',
            group: 'navigation.group-sales',
            icon: CalendarClock
        }
    ],
    tours: [
        {
            tour: 'stock-board',
            id: 'forms',
            target: 'stock-forms',
            title: 'inventory-tour.forms-title',
            body: 'inventory-tour.forms-body',
            order: 10
        },
        {
            tour: 'stock-board',
            id: 'board',
            target: 'stock-board',
            title: 'inventory-tour.board-title',
            body: 'inventory-tour.board-body',
            order: 20
        },
        {
            tour: 'stock-board',
            id: 'ledger',
            target: 'stock-ledger',
            title: 'inventory-tour.ledger-title',
            body: 'inventory-tour.ledger-body',
            order: 30
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.inventoryResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The product create form's opening-stock field: lazy, and `products` never imports it.
    slots: {
        'product-create-extras': [
            defineAsyncComponent(() => import('./components/OpeningStockField.vue'))
        ]
    }
} satisfies AppModule;
