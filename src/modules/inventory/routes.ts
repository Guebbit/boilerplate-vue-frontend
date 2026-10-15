/**
 * @module
 * Route table for the inventory domain — the ledger and the preorder board, each lazy-loaded so its
 * bundle only loads when the page is actually navigated to.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Inventory routes: the stock board with its ledger and receipt form, and the staff preorder board
 * under `sales/`.
 */
export default [
    {
        path: 'inventory',
        name: 'InventoryLedger',
        component: () => import('./views/InventoryLedger.vue'),
        meta: { access: 'auth', can: ['read', 'StockLevel'], title: 'inventory-page.page-title' }
    },
    {
        path: 'sales/preorders',
        name: 'PreordersBoard',
        component: () => import('./views/PreordersBoard.vue'),
        // `display`: `read:Order` would admit a customer, and the board lists other people's
        // fulfillment orders; only the staff action on orders opens it.
        meta: {
            access: 'auth',
            can: ['display', 'Order'],
            title: 'preorders-page.page-title'
        }
    }
] satisfies RouteRecordRaw[];
