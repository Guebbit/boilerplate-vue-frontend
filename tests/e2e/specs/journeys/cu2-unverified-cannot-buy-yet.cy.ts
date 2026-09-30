// requires-module: account, cart, delivery, inventory, orders, products
/**
 * @module
 * CU2 · An unverified account cannot buy yet. A visitor signs up and goes straight shopping,
 * without opening the verification mail. The cart takes the product, the till refuses in words
 * that say why, the banner offers a resend, and once the mailed link is spent the very same cart
 * checks out — nothing is added again.
 *
 * The story is about the refusal being specific and the cart surviving it: the message is the
 * API's own sentence, not a generic failure, and the basket is read back by its count before and
 * after. Needs a mailbox: the demo outbox, or Mailpit on live. Nothing here pays.
 */
import { addToCartFromStorefront, signUp } from '../../../support/e2e/steps';
import { mailedLinkUrl } from '../../../support/e2e/commands';

/** The address the visitor signs up with. */
const EMAIL = 'slow.reader.cu2@example.com';

/** A password that clears the strength rule. */
const PASSWORD = 'Slow_Reader_CU2_1!';

describe('CU2 · An unverified account cannot buy yet', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the till refuses an unproved address and says why; after verifying, the same cart checks out', () => {
        cy.skipUnlessMailbox();

        cy.step('signs up and shops without touching the inbox');
        signUp(EMAIL, PASSWORD);
        cy.get('[data-test=verify-banner]').should('exist');
        addToCartFromStorefront('product.barebones');

        cy.step('the till refuses, and the refusal says why');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        // Pickup needs no address, so the only thing standing between this basket and an order is
        // the unproved email.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('[data-test=cart-checkout-error]').should(
            'contain.text',
            'confirm your email address'
        );
        cy.location('pathname').should('match', /\/cart$/);
        cy.get('[data-test=cart-item]').should('have.length', 1);

        cy.step('the banner offers a resend, and honours the server’s cooldown');
        cy.get('[data-test=verify-resend]').click();
        cy.get('[data-test=verify-resend]').should('be.disabled');

        cy.step('spends the mailed link, and the banner goes');
        cy.emailTo(EMAIL).then((email) => {
            cy.visit(mailedLinkUrl(email));
        });
        cy.get('[data-test=verify-submit]').click();
        cy.get('#home-page').should('exist');
        cy.get('[data-test=verify-banner]').should('not.exist');

        cy.step('the same cart checks out, with nothing added again');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        // The one line the account shopped with, carried over the refusal and the verification.
        cy.get('[data-test=order-item-line-total]').should('have.length', 1);
    });
});
