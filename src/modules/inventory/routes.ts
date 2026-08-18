import type { RouteRecordRaw } from 'vue-router';

/**
 * Inventory routes: one admin page — the stock board, the ledger behind it, and the receipt form.
 */
export default [
    {
        path: 'inventory',
        name: 'InventoryLedger',
        component: () => import('./views/InventoryLedger.vue'),
        meta: { access: 'admin' }
    }
] satisfies RouteRecordRaw[];
