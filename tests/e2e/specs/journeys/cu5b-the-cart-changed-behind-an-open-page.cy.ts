// requires-module: account, cart, inventory, products
/**
 * @module
 * CU5b · The cart changed on the server behind an open page. The customer has the cart open with
 * two units. A second tab, played here by the API, raises the line to five. Coming back to the
 * page (the window gets focus) reads the cart again, so the screen says five before "Place order"
 * acts on it.
 *
 * What this does not cover: a customer who never leaves the page. That needs the checkout request
 * to carry the total the screen showed, which the contract does not have yet.
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';

/** What the cart page showed for the line. */
const SHOWN_UNITS = 2;

/** What the other tab raised it to. */
const OTHER_TAB_UNITS = 5;

describe('CU5b · The cart changed behind an open page', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the server cart again when the customer comes back to the page', () => {
        cy.subjectId('product.rich').then((productId) => {
            cy.loginAs('user');
            addToCartFromStorefront('product.rich');
            cy.goToCart();
            // The step is debounced: wait for its request, so the other tab's write comes after it.
            cy.intercept('PUT', '**/cart/*').as('step');
            cy.get('[data-test=cart-increase]').click();
            cy.wait('@step');
            cy.get('[data-test=cart-item]').should('contain.text', `Quantity: ${SHOWN_UNITS}`);

            cy.step('the other tab sets the line to five, through the API');
            cy.apiAs('user', 'PUT', `/cart/${productId}`, { quantity: OTHER_TAB_UNITS });

            cy.step('the customer comes back to this page: it reads the cart again');
            cy.window().then((win) => {
                win.dispatchEvent(new Event('focus'));
            });
            cy.get('[data-test=cart-item]').should('contain.text', `Quantity: ${OTHER_TAB_UNITS}`);
        });
    });
});
