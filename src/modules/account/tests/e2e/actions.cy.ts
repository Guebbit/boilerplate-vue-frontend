/**
 * @module
 * The account module's failure rows, run through the shared `actionTable` runner: each control is
 * pressed with its request answered by a server fault, and the page must show the alert, keep what
 * was typed, and work again once the stub is gone.
 */
import { actionTable } from '../../../../../tests/support/e2e/action-table';

actionTable('account', [
    {
        name: 'a failed address removal keeps the address listed, and a retry succeeds',
        persona: 'user',
        route: '/en/profile',
        trigger: () => {
            cy.get('[data-test=address-remove]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
        },
        intercept: {
            method: 'DELETE',
            url: '**/account/addresses/*',
            operation: '/account/addresses/{addressId}'
        },
        kind: 'row',
        alert: 'address-row-action-error',
        message: 'The removal failed',
        listed: '[data-test=address-item]'
    },
    {
        name: 'a failed address save keeps the dialog open with what was typed, and a retry succeeds',
        persona: 'user',
        route: '/en/profile',
        prepare: () => {
            cy.get('[data-test=address-add]').click();
            cy.get('[data-test=address-dialog]').within(() => {
                const values = ['Studio', 'Gino Pino', 'Via dei Coralli 12', '00184', 'Roma'];
                for (const [index, value] of values.entries()) {
                    cy.get('input').eq(index).should('not.be.disabled').clear();
                    cy.get('input').eq(index).type(value);
                }
                cy.get('[data-test=address-country]').click();
                cy.get('[data-test=address-country]').type('Italy');
            });
            cy.get('.v-overlay-container .v-list-item').first().click();
        },
        trigger: () => {
            cy.get('[data-test=address-save]').click();
        },
        intercept: {
            method: 'POST',
            url: '**/account/addresses',
            operation: '/account/addresses'
        },
        kind: 'dialog',
        alert: 'address-save-error',
        message: 'The save failed',
        valuesNotCompared:
            'the country autocomplete clears its search text once a country is chosen',
        dialog: '[data-test=address-dialog]',
        control: '[data-test=address-save]'
    }
]);
