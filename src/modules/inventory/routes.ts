import type { RouteRecordRaw } from 'vue-router';

/**
 * Inventory routes: one admin page — the ledger with its restock form.
 */
export default [
    {
        path: 'inventory',
        name: 'InventoryLedger',
        component: () => import('./views/InventoryLedger.vue'),
        meta: { access: 'admin' }
    }
] satisfies RouteRecordRaw[];
