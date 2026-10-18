/**
 * @module
 * The wishlist's failure rows, run through the shared `actionTable` runner: removing a heart
 * answered with a server fault keeps the line listed and shows the alert, and a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

actionTable('wishlist', [
    {
        name: 'a failed removal keeps the line listed and shows the alert, and a retry succeeds',
        persona: 'user',
        route: '/en/wishlist',
        trigger: () => {
            cy.get('[data-test=wishlist-remove]').first().click();
        },
        intercept: { method: 'DELETE', url: '**/wishlist/*', operation: '/wishlist/{productId}' },
        kind: 'row',
        alert: 'wishlist-line-action-error',
        message: 'The removal failed',
        listed: '[data-test=wishlist-item]'
    },
    {
        name: 'a failed save from the product page keeps the heart and shows the alert, and a retry succeeds',
        persona: 'user',
        route: () => cy.subjectId('product.barebones').then((id) => `/en/products/${id}`),
        trigger: () => {
            cy.get('[data-test=wishlist-toggle]').click();
        },
        intercept: { method: 'PUT', url: '**/wishlist/*', operation: '/wishlist/{productId}' },
        kind: 'row',
        alert: 'wishlist-toggle-error',
        message: 'The save failed',
        listed: '[data-test=wishlist-toggle]'
    }
]);
