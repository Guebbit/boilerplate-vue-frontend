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
 * Reaches into `products` — a `conformist` read of `useProductsStore` as it is, to name products in
 * the receipt select and the ledger titles — because the page names products (the receipt select,
 * the title lookup) through the products barrel, the same one-way arrow the BE's inventory module
 * has. The preorder board also mounts `delivery`'s second tab and reads its per-product counts
 * through that barrel, a `published-language` reach: the fulfillment orders are `delivery`'s, and
 * this module learns nothing of a shipment. Deleting this module removes the boards and the ledger
 * behind them; every shelf count stays correct, every WHY goes unrecorded.
 *
 * A ledger that explains stock without owning it — specific to running a shop, not the reason
 * anyone shops here.
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
