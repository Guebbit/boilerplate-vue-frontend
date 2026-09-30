// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * AC3 · Prove it's still you. Checkout and the data export each want a recent proof of the
 * password, and a customer who logged in "a while ago" meets the re-auth dialog instead of a
 * failure. A wrong password shows an error and keeps the dialog; cancel abandons the action; the
 * right password carries on with the very action that was asked for.
 *
 * Time passes by moving the demo backend's clock (`cy.travel`), so this is a demo-only journey.
 * The windows are the backend's `NODE_REAUTH_TIME_CRITICAL` (300 s, money and account deletion)
 * and `NODE_REAUTH_TIME_SENSITIVE` (900 s, export and session management).
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';
import { seedAccount } from '../../../support/e2e/scenario';

/** Past the critical window (300 s), inside the access token's own life (600 s). */
const PAST_CRITICAL_MS = 400_000;

/** Past the sensitive window (900 s); the access token has lapsed too, so a refresh comes first. */
const PAST_SENSITIVE_MS = 1_000_000;

/**
 * Types a password into the open re-auth dialog and submits it.
 *
 * @param password - what to type
 */
const answerDialog = (password: string): void => {
    cy.get('[data-test=reauth-dialog-password] input').type(password);
    cy.get('[data-test=reauth-dialog-submit]').click();
};

describe('AC3 · Prove it’s still you', { tags: '@smoke' }, () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('checkout and export ask for the password, refuse a wrong one, and carry on once it is right', () => {
        cy.skipUnlessDemo();

        cy.step('the customer fills a cart, and the fresh-login window lapses');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.travel(PAST_CRITICAL_MS);

        cy.step('checkout opens the re-auth dialog instead of failing');
        cy.intercept('POST', '**/cart/checkout').as('checkout');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.wait('@checkout').its('response.statusCode').should('equal', 401);
        cy.get('[data-test=reauth-dialog]').should('be.visible');

        cy.step('a wrong password shows an error and stays in the dialog');
        answerDialog('not-the-password');
        cy.get('[data-test=reauth-dialog-password] .v-messages__message')
            .should('exist')
            .and('not.contain.text', 'Unprocessable Entity');
        cy.get('[data-test=reauth-dialog]').should('be.visible');

        cy.step('cancel abandons the checkout, and says why in the API’s own words');
        cy.get('[data-test=reauth-dialog-cancel]').click();
        cy.get('[data-test=reauth-dialog]').should('not.exist');
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.get('[data-test=cart-checkout-error]')
            .should('not.be.empty')
            .and('not.contain.text', 'Unauthorized');

        cy.step('the right password carries on with the same checkout');
        cy.get('[data-test=cart-checkout]').click();
        cy.wait('@checkout').its('response.statusCode').should('equal', 401);
        cy.get('[data-test=reauth-dialog]').should('be.visible');
        answerDialog(seedAccount('user').password);
        cy.wait('@checkout').its('response.statusCode').should('equal', 201);
        cy.get('#order-target').should('exist');

        cy.step('much later, the export asks too; the session has to be renewed first');
        cy.travel(PAST_SENSITIVE_MS);
        cy.visit('/en/profile');
        cy.intercept('POST', '**/account/export').as('export');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export').its('response.statusCode').should('equal', 401);
        cy.get('[data-test=reauth-dialog]').should('be.visible');

        cy.step('cancel abandons the export');
        cy.get('[data-test=reauth-dialog-cancel]').click();
        cy.get('[data-test=reauth-dialog]').should('not.exist');
        cy.get('[data-test=profile-export-data-error]')
            .should('not.be.empty')
            .and('not.contain.text', 'Unauthorized');

        cy.step('the right password lets the same export through');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export').its('response.statusCode').should('equal', 401);
        answerDialog(seedAccount('user').password);
        cy.wait('@export').its('response.statusCode').should('equal', 200);
        cy.get('[data-test=reauth-dialog]').should('not.exist');
    });
});
