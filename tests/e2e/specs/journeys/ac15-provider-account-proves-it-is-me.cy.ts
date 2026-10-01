// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * AC15 · An account made through a provider proves it is still the owner. It has no password, so
 * the re-auth dialog offers a code mailed to its address instead: "send code" (locked for the
 * server's cooldown afterwards), a wrong code is refused and keeps the dialog, and the right one
 * carries on with the very checkout that was asked for.
 *
 * Demo only: the fake OAuth provider exists only there, and time passes by moving the demo
 * backend's clock (`cy.travel`), past the 300 s window that guards money.
 */
import { addToCartFromStorefront, fillAddressDialog } from '../../../support/e2e/steps';

/** Past the critical window (300 s), inside the access token's own life (600 s). */
const PAST_CRITICAL_MS = 400_000;

/** The address the fake provider hands back, pre-verified. */
const PROVIDER_EMAIL = 'oauth.demo@example.com';

describe('AC15 · A provider account proves it is still the owner', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('checkout asks for a mailed code instead of a password, refuses a wrong one, and carries on once it is right', () => {
        cy.skipUnlessDemo();

        cy.step('a new visitor signs in through the provider and fills a cart');
        cy.visit('/en/login');
        cy.get('[data-test=oauth-fake]').click();
        cy.get('#home-page').should('exist');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        cy.get('[data-test=shipping-method-pickup]').click();
        // A new account's book is empty and the invoice needs an address, even for a pickup.
        cy.get('[data-test=billing-address-picker-add]').click();
        fillAddressDialog({
            label: 'Home',
            fullName: 'Ada Lovelace',
            street: 'Via Emilia 1',
            zip: '41121',
            city: 'Modena',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');

        cy.step('the fresh-login window lapses, and checkout opens the dialog');
        cy.travel(PAST_CRITICAL_MS);
        cy.intercept('POST', '**/cart/checkout').as('checkout');
        // Forced: the "address saved" toast can sit over the foot of the page, where the button is.
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click({ force: true });
        cy.wait('@checkout').its('response.statusCode').should('equal', 401);
        cy.get('[data-test=reauth-dialog]').should('be.visible');

        cy.step('the dialog is no dead end: no password field, a way to get a code');
        cy.get('[data-test=reauth-dialog-password]').should('not.exist');
        cy.get('[data-test=reauth-dialog-code]').should('be.visible');
        cy.get('[data-test=reauth-dialog-submit]').should('be.disabled');

        cy.step('sending the code locks the button for the server’s own cooldown');
        cy.intercept('POST', '**/account/reauth/methods/email/send').as('send');
        cy.get('[data-test=reauth-dialog-send]').click();
        cy.wait('@send').its('response.statusCode').should('equal', 200);
        cy.get('[data-test=reauth-dialog-sent]').should('be.visible');
        cy.get('[data-test=reauth-dialog-send]').should('be.disabled');

        cy.step('a wrong code is refused, in words about the code, and the dialog stays');
        cy.get('[data-test=reauth-dialog-code] input').type('000000');
        cy.get('[data-test=reauth-dialog-submit]').click();
        cy.get('[data-test=reauth-dialog-code] .v-messages__message')
            .should('exist')
            .and('not.contain.text', 'password');
        cy.get('[data-test=reauth-dialog]').should('be.visible');

        cy.step('the mailed code carries on with the same checkout');
        cy.intercept('POST', '**/account/reauth').as('reauth');
        cy.typeMailedTwoFactorCode(PROVIDER_EMAIL, '[data-test=reauth-dialog-code] input');
        cy.get('[data-test=reauth-dialog-submit]').click();
        cy.wait('@reauth').its('response.statusCode').should('equal', 200);
        cy.wait('@checkout').its('response.statusCode').should('equal', 201);
        cy.get('#order-target').should('exist');
    });
});
