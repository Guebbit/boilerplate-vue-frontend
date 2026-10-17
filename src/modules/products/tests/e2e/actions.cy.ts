/**
 * @module
 * The products module's failure rows, run through the shared `actionTable` runner: each form is
 * submitted with its request answered by a server fault, and must show the alert, keep what was
 * typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

actionTable('products', [
    {
        name: 'a failed create keeps the form and its typed values, and a retry succeeds',
        persona: 'editor',
        route: '/en/products/create',
        prepare: () => {
            cy.get('#translation-panel-en [data-test=translation-title-field] input').type(
                'A product that fails to save'
            );
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type('19.99');
        },
        trigger: () => {
            cy.get('form').first().submit();
        },
        intercept: { method: 'POST', url: '**/products', operation: '/products' },
        kind: 'form',
        alert: 'product-create-submit-error',
        message: 'The create failed'
    },
    {
        name: 'a failed edit keeps the form and its typed values, and a retry succeeds',
        persona: 'editor',
        route: () => cy.subjectId('product.inStock').then((id) => `/en/products/${id}/edit`),
        prepare: () => {
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type('41.50');
        },
        trigger: () => {
            cy.get('form').first().submit();
        },
        intercept: { method: 'PATCH', url: '**/products/*', operation: '/products/{id}' },
        kind: 'form',
        alert: 'product-edit-submit-error',
        message: 'The save failed'
    }
]);
