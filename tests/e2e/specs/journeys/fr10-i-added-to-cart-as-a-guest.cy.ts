// requires-module: account, cart, products
/**
 * @module
 * FR10 · I wanted to add it to my cart as a guest. A guest on a product page finds the buy button
 * switched off, not a wall: nothing to click until there is an account behind it. "Log in" in the
 * app bar takes them away and, once they are in, brings them BACK to that product, where one click
 * adds it. "Sign up" carries the same return address, so a new account lands on that product too, not
 * on the home page.
 */
import { addOpenProductToCart, fillSignupForm } from '../../../support/e2e/steps';

/** The address the story signs up with. */
const NEWCOMER = 'fr10.newcomer@example.com';

/** A password that clears the strength rule. */
const NEWCOMER_PASSWORD = 'Fr10-Newcomer-Pass-1!';

describe('FR10 · I wanted to add it to my cart as a guest', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // The customer's own cart may hold lines already; start from empty so a line can only
        // be there because this story added it.
        cy.apiAs('user', 'DELETE', '/cart/all');
    });

    it('a guest cannot buy, and logging in or signing up brings them back to the product', () => {
        cy.subjectProduct('product.inStock').then((product) => {
            const productPath = `/en/products/${product.id}`;

            cy.step('a guest on the product page finds the buy button switched off');
            cy.visit(productPath);
            cy.get('#product-target').should('exist');
            cy.get('[data-test=add-to-cart]').should('be.disabled');

            cy.step('"Log in" in the app bar remembers the product');
            cy.get('[data-test=nav-login-link]').click();
            cy.get('#login-page').should('exist');
            cy.location('search').then((search) => {
                expect(decodeURIComponent(search)).to.include(`continue=${productPath}`);
            });

            cy.step('once in, the visitor is back on that product, and one click adds it');
            cy.accountOf('user').then(({ email, password }) => {
                cy.get('[type=email]').should('not.be.disabled').clear();
                cy.get('[type=email]').type(email);
                cy.get('[type=password]').clear();
                cy.get('[type=password]').type(password);
                cy.get('form').submit();
            });
            cy.location('pathname').should('equal', productPath);
            cy.get('[data-test=add-to-cart]').should('not.be.disabled');
            addOpenProductToCart();
            cy.goToCart();
            cy.contains('[data-test=cart-item]', product.title).should('exist');

            cy.step('logged out again, "Sign up" in the app bar remembers the product too');
            // Logging out lands on Home, so the guest walks back to the product first.
            cy.logout();
            cy.visit(productPath);
            cy.get('[data-test=nav-login-link]').should('exist');
            cy.get('header a[href^="/en/signup"]').click();
            cy.get('#signup-page').should('exist');
            cy.location('search').then((search) => {
                expect(decodeURIComponent(search)).to.include(`continue=${productPath}`);
            });

            cy.step('the new account lands back on the product, not on the home page');
            fillSignupForm(NEWCOMER, NEWCOMER_PASSWORD);
            cy.location('pathname').should('equal', productPath);
            cy.get('#product-target').should('exist');
        });
    });
});
