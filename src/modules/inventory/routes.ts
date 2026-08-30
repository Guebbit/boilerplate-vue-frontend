/**
 * @module
 * Route table for the inventory domain — one entry, lazy-loaded so the ledger's bundle only
 * loads when the page is actually navigated to.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Inventory routes: one admin page — the stock board, the ledger behind it, and the receipt form.
 */
export default [
    {
        path: 'inventory',
        name: 'InventoryLedger',
        component: () => import('./views/InventoryLedger.vue'),
        meta: { access: 'admin', title: 'inventory-page.page-title' }
    }
] satisfies RouteRecordRaw[];
