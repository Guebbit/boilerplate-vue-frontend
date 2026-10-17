/**
 * @module
 * The cart's failure rows, run through the shared `actionTable` runner: removing a line answered
 * with a server fault keeps the line listed and shows the alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

actionTable('cart', [
    {
        name: 'a failed line removal keeps the line listed and shows the alert, and a retry succeeds',
        persona: 'user',
        route: () =>
            cy
                .apiAs('user', 'DELETE', '/cart/all')
                .then(() => cy.subjectId('product.inStock'))
                .then((productId) =>
                    cy
                        .apiAs('user', 'POST', '/cart', { productId, quantity: 1 })
                        .then(() => '/en/cart')
                ),
        // The shipping methods load after the lines; the typed values are read once both are in.
        prepare: () => {
            cy.get('[data-test=shipping-method-standard]').should('exist');
        },
        trigger: () => {
            cy.get('[data-test=cart-remove]').first().click();
        },
        intercept: { method: 'DELETE', url: '**/cart/*', operation: '/cart/{productId}' },
        kind: 'row',
        alert: 'cart-line-action-error',
        message: 'The removal failed',
        listed: '[data-test=cart-item]'
    }
]);
