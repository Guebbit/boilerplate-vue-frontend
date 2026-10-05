// requires-module: account, cart, inventory, products
/**
 * @module
 * CU4b · A slow `GET /cart` around a shipping pick. A customer adds a product from its page (the
 * cart store now holds a cart), opens the cart page through the app bar (a route change, not a
 * reload, so the page draws at once from that cart) and picks a delivery method while the read
 * the page opened with is still out. Whatever order the answers arrive in, the radio shows what
 * the server holds, and "Place order" stays available.
 *
 * - **Read slower than the pick's answer**: the opening read answers after the pick was confirmed.
 * - **Pick slower than the read**: the read answers first with no method, then the pick's answer
 *   lands: the older read must not wipe the radio, and the newer answer must not be lost.
 *
 * The network is stubbed with delays on purpose; the backend really answers every request.
 */
import { addToCartFromStorefront } from '../../../support/e2e/steps';

/**
 * Holds every answer of a request for a while.
 *
 * @param method - the HTTP method
 * @param url - the URL glob
 * @param alias - the alias to wait on
 * @param delayMs - how long the answer is held
 */
const holdAnswers = (method: 'GET' | 'PUT', url: string, alias: string, delayMs: number): void => {
    cy.intercept(method, url, (request) => {
        request.on('response', (response) => {
            response.setDelay(delayMs);
        });
    }).as(alias);
};

describe('CU4b · A slow cart read around a shipping pick', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('keeps the delivery method picked while the opening read was still out', () => {
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        holdAnswers('GET', '**/cart', 'openingRead', 2000);

        cy.goToCart();
        // The page already shows the cart the add answered with, so the picker is there to use.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=shipping-method-pickup] input').should('be.checked');

        cy.wait('@openingRead');
        cy.get('[data-test=shipping-method-pickup] input').should('be.checked');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');
    });

    it('keeps the pick when the read answers first, with no method, and the pick answers last', () => {
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        holdAnswers('GET', '**/cart', 'openingRead', 1000);
        holdAnswers('PUT', '**/cart/shipping-method', 'pick', 3000);

        cy.goToCart();
        cy.get('[data-test=shipping-method-pickup]').click();

        cy.step('the read answers while the pick is still out: the radio does not move');
        cy.wait('@openingRead');
        cy.get('[data-test=shipping-method-pickup] input').should('be.checked');

        cy.step('the pick answers last, and what it says is what the page shows');
        cy.wait('@pick');
        cy.get('[data-test=shipping-method-pickup] input').should('be.checked');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');
    });
});
