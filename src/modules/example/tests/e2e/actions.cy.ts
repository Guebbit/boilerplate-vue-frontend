/**
 * @module
 * The example module's failure rows, run through the shared `actionTable` runner: each control is
 * pressed with its request answered by a server fault, and the page must show the alert, keep
 * what was typed, and work again once the stub is gone. This is the table a new module copies.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

/** The customer's seeded published example, the same pinned id the a11y sweep edits. */
const CUSTOMER_PUBLISHED = '65e1a0000000000000000e01';

actionTable('example', [
    {
        name: 'a failed create keeps the form and its typed values, and a retry succeeds',
        persona: 'user',
        route: '/en/examples/create',
        prepare: () => {
            cy.get('[data-test=example-title] input').type('A note that fails to save');
            cy.get('[data-test=example-body] textarea').type('Typed before the fault.');
        },
        trigger: () => {
            cy.get('form button[type=submit]').click();
        },
        intercept: { method: 'POST', url: '**/examples', operation: '/examples' },
        kind: 'form',
        alert: 'example-create-error',
        message: 'The create failed',
        control: 'form button[type=submit]'
    },
    {
        name: 'a failed edit keeps the form and its typed values, and a retry succeeds',
        persona: 'user',
        route: `/en/examples/${CUSTOMER_PUBLISHED}/edit`,
        prepare: () => {
            cy.get('[data-test=example-title] input').should('not.have.value', '');
            cy.get('[data-test=example-title] input').type(' (edited)');
        },
        trigger: () => {
            cy.get('[data-test=example-submit]').click();
        },
        intercept: {
            method: 'PATCH',
            url: `**/examples/${CUSTOMER_PUBLISHED}`,
            operation: '/examples/{id}'
        },
        kind: 'form',
        alert: 'example-edit-form-error',
        message: 'The save failed',
        control: '[data-test=example-submit]'
    },
    {
        name: 'a failed delete keeps the row listed and shows the alert, and a retry succeeds',
        persona: 'user',
        route: '/en/examples',
        trigger: () => {
            cy.get('[data-test=row-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/examples/*', operation: '/examples/{id}' },
        kind: 'row',
        alert: 'examples-list-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=list-row]'
    },
    {
        name: 'a failed delete from the detail page keeps the example and its button, and a retry succeeds',
        persona: 'user',
        route: `/en/examples/${CUSTOMER_PUBLISHED}`,
        trigger: () => {
            cy.get('[data-test=example-delete]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: {
            method: 'DELETE',
            url: `**/examples/${CUSTOMER_PUBLISHED}`,
            operation: '/examples/{id}'
        },
        kind: 'row',
        alert: 'example-target-delete-error',
        message: 'The delete failed',
        listed: '[data-test=example-delete]'
    }
]);
