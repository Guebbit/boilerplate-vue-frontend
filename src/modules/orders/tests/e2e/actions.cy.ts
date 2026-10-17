/**
 * @module
 * The orders module's failure rows, run through the shared `actionTable` runner: the staff edit
 * form is submitted with its request answered by a server fault, and must show the alert, keep
 * what was typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

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
    }
]);
