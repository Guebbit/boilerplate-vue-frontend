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

/**
 * Chooses a product in one of the stock forms' autocomplete.
 *
 * @param field - the field's `data-test`
 */
const pickInStockProduct = (field: string): void => {
    cy.subjectProduct('product.inStock').then((product) => {
        cy.get(`[data-test=${field}] input`).clear();
        cy.get(`[data-test=${field}] input`).type(product.title);
        cy.get('[role=listbox] [role=option]').contains(product.title).click();
    });
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
    },
    {
        name: 'a failed stock receipt keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: '/en/inventory',
        prepare: () => {
            cy.get('[data-test=levels-low-only] input').uncheck({ force: true });
            pickInStockProduct('receipt-product');
            cy.get('[data-test=receipt-quantity] input').clear();
            cy.get('[data-test=receipt-quantity] input').type('3');
            cy.get('[data-test=receipt-note] input').type('typed before the fault');
        },
        trigger: () => {
            cy.get('[data-test=receipt-submit]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/inventory/receipts',
            operation: '/inventory/receipts'
        },
        kind: 'form',
        alert: 'receipt-error',
        message: 'The receipt failed',
        valuesNotCompared:
            'the product autocomplete rewrites its search text once a product is chosen',
        control: '[data-test=receipt-submit]'
    },
    {
        name: 'a failed stock adjustment keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: '/en/inventory',
        prepare: () => {
            cy.get('[data-test=levels-low-only] input').uncheck({ force: true });
            pickInStockProduct('adjust-product');
            cy.get('[data-test=adjust-delta] input').clear();
            cy.get('[data-test=adjust-delta] input').type('-1');
            cy.get('[data-test=adjust-note] input').type('typed before the fault');
        },
        trigger: () => {
            cy.get('[data-test=adjust-submit]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/inventory/adjustments',
            operation: '/inventory/adjustments'
        },
        kind: 'form',
        alert: 'adjust-error',
        message: 'The adjustment failed',
        valuesNotCompared:
            'the product autocomplete rewrites its search text once a product is chosen',
        control: '[data-test=adjust-submit]'
    }
]);
