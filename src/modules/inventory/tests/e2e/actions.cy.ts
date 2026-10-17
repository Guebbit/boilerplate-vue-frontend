/**
 * @module
 * The inventory module's empty-state rows, run through the shared `actionTable` runner: each list read
 * is answered with a schema-checked empty page, and the screen must show its empty copy, no rows
 * and no pager.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import {
    ListPreorderFulfillmentOrdersResponse,
    ListPreorderLevelsResponse,
    ListStockMovementsResponse
} from '../../../../../contracts/rest/schemas.zod';

/** An empty page, as the paged list reads answer it. */
const emptyPage = {
    success: true,
    status: 200,
    message: 'OK',
    data: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }
};

actionTable('inventory', [
    {
        name: 'the ledger with no movements shows its empty state',
        persona: 'admin',
        route: '/en/inventory',
        intercept: {
            method: 'GET',
            url: '**/inventory/movements?*',
            operation: '/inventory/movements'
        },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: ListStockMovementsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    },
    {
        name: 'the preorder board with no products shows its empty state',
        persona: 'admin',
        route: '/en/sales/preorders',
        intercept: {
            method: 'GET',
            url: '**/inventory/preorders?*',
            operation: '/inventory/preorders'
        },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: ListPreorderLevelsResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    },
    {
        name: 'the preorder board with no orders shows its empty state',
        persona: 'admin',
        route: '/en/sales/preorders?tab=orders',
        intercept: {
            method: 'GET',
            url: '**/delivery/fulfillment-orders?*',
            operation: '/delivery/fulfillment-orders'
        },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: ListPreorderFulfillmentOrdersResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=list-row]' }
    }
]);
