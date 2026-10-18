/**
 * @module
 * The users module's failure rows, run through the shared `actionTable` runner: each form is
 * submitted with its request answered by a server fault, and must show the alert, keep what was
 * typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

/** A name unique per run, so two specs on one backend cannot collide. */
const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

actionTable('users', [
    {
        name: 'a failed create keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: '/en/users/create',
        prepare: () => {
            const username = `e2e-fault-${unique()}`;
            cy.get('[data-test=user-email] input').type(`${username}@example.com`);
            cy.get('[data-test=user-username] input').type(username);
        },
        trigger: () => {
            cy.get('form').submit();
        },
        intercept: { method: 'POST', url: '**/users', operation: '/users' },
        kind: 'form',
        alert: 'user-create-submit-error',
        message: 'The create failed'
    },
    {
        name: 'a failed edit keeps the form and its typed values, and a retry succeeds',
        persona: 'admin',
        route: () => {
            const username = `e2e-edit-fault-${unique()}`;
            return cy
                .apiAs<{ id: string }>('admin', 'POST', '/users', {
                    email: `${username}@example.com`,
                    username
                })
                .then((created) => `/en/users/${String(created?.id)}/edit`);
        },
        prepare: () => {
            cy.get('[data-test=user-edit-username] input').should('not.have.value', '');
            cy.get('[data-test=user-edit-username] input').type('-edited');
        },
        trigger: () => {
            cy.get('form').submit();
        },
        intercept: { method: 'PATCH', url: '**/users/*', operation: '/users/{id}' },
        kind: 'form',
        alert: 'user-edit-submit-error',
        message: 'The save failed'
    },
    {
        name: 'a failed delete keeps the row listed and shows the alert, and a retry succeeds',
        persona: 'admin',
        route: '/en/users',
        trigger: () => {
            cy.get('[data-test=row-delete]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/users/*', operation: '/users/{id}' },
        kind: 'row',
        alert: 'users-list-row-action-error',
        message: 'The delete failed',
        listed: '[data-test=list-row]'
    },
    {
        name: 'a slow record read leaves the form closed until it lands, and a refetch keeps what was typed',
        persona: 'admin',
        route: () => cy.accountInRole('user').then((account) => `/en/users/${account.id}/edit`),
        intercept: { method: 'GET', url: '**/users/*', operation: '/users/{id}' },
        kind: 'slow',
        field: 'user-edit-username',
        typed: 'typed-before-the-switch'
    }
]);
