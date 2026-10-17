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
    },
    {
        name: 'a failed delete keeps the row listed and shows the alert, and a retry succeeds',
        persona: 'editor',
        route: '/en/products',
        trigger: () => {
            cy.get('[data-test=row-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/products/*', operation: '/products/{id}' },
        kind: 'row',
        alert: 'products-list-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=list-row]'
    },
    {
        name: 'a slow record read leaves the form closed until it lands, and a refetch keeps what was typed',
        persona: 'editor',
        route: () => cy.subjectId('product.inStock').then((id) => `/en/products/${id}/edit`),
        intercept: { method: 'GET', url: '**/products/*/admin', operation: '/products/{id}/admin' },
        kind: 'slow',
        field: 'product-price-field',
        typed: '41.50',
        // The Italian number format: the value kept, written as the new language writes it.
        keptAs: '41,50'
    }
]);
