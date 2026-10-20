/**
 * @module
 * The languages page's failure rows, run through the shared `actionTable` runner: registering or
 * deleting a language answered with a server fault keeps the form or the row, shows the alert, and
 * a retry works.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

actionTable('locales', [
    {
        name: 'a failed registration keeps the dialog and what was typed, and a retry succeeds',
        persona: 'editor',
        route: '/en/locales',
        prepare: () => {
            cy.get('[data-test=language-create]').click();
            cy.get('[data-test=language-tag] input').type('de');
            cy.get('[data-test=language-name] input').type('German');
            cy.get('[data-test=language-native-name] input').type('Deutsch');
        },
        trigger: () => {
            cy.get('[data-test=language-save]').click();
        },
        intercept: { method: 'POST', url: '**/locales', operation: '/locales' },
        kind: 'dialog',
        alert: 'language-form-error',
        dialog: '[data-test=language-form]',
        control: '[data-test=language-save]'
    },
    {
        name: 'a failed delete keeps the language listed and shows the alert, and a retry succeeds',
        persona: 'editor',
        route: '/en/locales',
        trigger: () => {
            cy.get('[data-test=row-delete]').last().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: { method: 'DELETE', url: '**/locales/*', operation: '/locales/{locale}' },
        kind: 'row',
        alert: 'locales-list-delete-error',
        listed: '[data-test=row-delete]'
    }
]);
