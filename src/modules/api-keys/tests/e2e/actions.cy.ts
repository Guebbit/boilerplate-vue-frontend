/**
 * @module
 * The api-keys module's failure rows, run through the shared `actionTable` runner: the mint form
 * is submitted with its request answered by a server fault, and must show the alert, keep what was
 * typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

/** A `datetime-local` value a week ahead — the mint form requires an expiry. */
const weekAhead = (): string => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 16);

actionTable('api-keys', [
    {
        name: 'a failed mint keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: '/en/api-keys/create',
        prepare: () => {
            cy.get('[data-test=api-key-name] input').type('A key that fails to mint');
            cy.get('[data-test=api-key-permissions] input').type('display:Product{enter}');
            cy.get('[data-test=api-key-expires-at] input').type(weekAhead());
        },
        trigger: () => {
            cy.get('form').submit();
        },
        intercept: { method: 'POST', url: '**/api-keys', operation: '/api-keys' },
        kind: 'form',
        alert: 'api-key-create-error',
        message: 'The mint failed'
    }
]);
