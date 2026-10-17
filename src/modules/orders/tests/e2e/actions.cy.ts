/**
 * @module
 * The orders module's failure rows, run through the shared `actionTable` runner: the staff edit
 * form is submitted with its request answered by a server fault, and must show the alert, keep
 * what was typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';
import { SearchOrdersResponse } from '../../../../../contracts/rest/schemas.zod';

/** A list answer with nothing in it, for the list read the empty rows stub. */
const emptyPage = {
    success: true,
    status: 200,
    message: 'OK',
    data: { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }
};

actionTable('orders', [
    {
        name: 'a failed edit keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: () => cy.subjectId('order.otherPending').then((id) => `/en/orders/${id}/edit`),
        prepare: () => {
            cy.get('[data-test=order-edit-email] input').should('not.have.value', '');
            cy.get('[data-test=order-edit-email] input').clear();
            cy.get('[data-test=order-edit-email] input').type('typed-before-the-fault@example.com');
        },
        trigger: () => {
            cy.get('form').first().submit();
        },
        intercept: { method: 'PATCH', url: '**/orders/*', operation: '/orders/{id}' },
        kind: 'form',
        alert: 'order-edit-form-error',
        message: 'The save failed'
    },
    {
        name: 'a customer with no orders sees the empty state and its way to the cart',
        persona: 'user',
        route: '/en/orders',
        trigger: () => undefined,
        intercept: { method: 'POST', url: '**/orders/search', operation: '/orders/search' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: SearchOrdersResponse,
        empty: {
            copy: '.v-empty-state',
            rows: '[data-test=row-view]',
            cta: { selector: '.v-empty-state a', path: '/en/cart' }
        }
    },
    {
        name: 'staff with no orders to list see the staff empty state, with no way to the cart',
        persona: 'admin',
        route: '/en/sales/orders',
        trigger: () => undefined,
        intercept: { method: 'POST', url: '**/orders/search', operation: '/orders/search' },
        kind: 'empty',
        emptyBody: emptyPage,
        emptySchema: SearchOrdersResponse,
        empty: { copy: '.v-empty-state', rows: '[data-test=row-view]' }
    }
]);
