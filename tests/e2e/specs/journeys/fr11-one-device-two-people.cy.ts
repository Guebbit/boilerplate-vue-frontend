// requires-module: account, cart, products, wishlist
/**
 * @module
 * FR11 · One device, two people. A customer fills the cart and saves products, logs out, and a
 * second person signs in on the same tab, with no reload in between. The bar's count and total and
 * the hearts have to be the second person's own: nothing the first one left in memory may show.
 *
 * Then the other half of "shared device": a logout in another tab reaches this one over the
 * `session` BroadcastChannel. The spec posts that message itself, standing in for the other tab.
 * This tab must end up signed out, with the second person's cart gone from the bar too.
 *
 * The second person is the seeded second-shopper customer (staff hold no
 * shopping key, so none of them could be one).
 */
import {
    addOpenProductToCart,
    addToCartFromStorefront,
    searchAndOpenProduct
} from '../../../support/e2e/steps';

describe('FR11 · One device, two people', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the next person their own cart and hearts, and follows a logout from another tab', () => {
        cy.step('the customer has a cart, and a seeded heart on the product they add');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Saved');
        cy.get('[data-test=nav-badge]').should('exist');
        cy.get('[data-test=pinned-Cart]').invoke('text').should('match', /\d/);

        cy.step('the second person signs in on the same tab: the bar shows nothing of it');
        cy.switchUser('secondShopper');
        cy.get('[data-test=nav-badge]').should('not.exist');
        // An empty cart still writes its total: zero, not the customer's.
        cy.get('[data-test=pinned-Cart]').should('contain.text', '0.00');

        cy.step('the second person opens the same product while the wishlist is slow to answer');
        // The heart refetches on mount, so a leak would only show while that answer is in flight.
        cy.intercept('GET', '**/wishlist', (request) => {
            request.on('response', (response) => {
                response.setDelay(2500);
            });
        }).as('wishlist');
        cy.navigateTo('/en/products');
        searchAndOpenProduct('product.rich');
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist');
        cy.wait('@wishlist');
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist');

        cy.step("the second person fills a cart of their own: one line, not the customer's");
        addOpenProductToCart();
        cy.get('[data-test=nav-badge]').should('contain.text', '1');

        cy.step('another tab logs out: this one is signed out and the cart leaves the bar');
        cy.window().then((win) => {
            // A second channel object in the same page: a channel never hears its own posts, and
            // the app's own instance is module-private.
            const otherTab = new win.BroadcastChannel('session');
            otherTab.postMessage({ type: 'logout' });
            otherTab.close();
        });
        cy.get('[data-test=nav-login-link]').should('exist');
        cy.get('[data-test=nav-badge]').should('not.exist');
        cy.get('[data-test=add-to-cart]').should('be.disabled');
    });
});
