/**
 * @module
 * The example module's failure rows, run through the shared `actionTable` runner: each control is
 * pressed with its request answered by a server fault, and the page must show the alert, keep
 * what was typed, and work again once the stub is gone. This is the table a new module copies.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

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
    }
]);
