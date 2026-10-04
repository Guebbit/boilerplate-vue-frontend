// requires-module: account, cart, notifications, products
/**
 * @module
 * CU27 · I filled a cart before I had signed in. A guest adds to a cart kept in the browser, steps
 * it, reloads and still has it; checking out is not offered until they sign in. Signing in merges
 * the cart into the account's: lines add up, and a line the shop can no longer sell is left out
 * with a message in the bell instead of a lost cart.
 *
 * - **Kept**: the guest cart survives a reload, and checkout is gated.
 * - **Merged**: after sign-in the lines are in the account's cart and the browser's copy is gone.
 * - **Summed**: a product already in the account's cart grows by the guest's quantity.
 * - **Refused**: a product pulled while it sat in the guest cart is skipped, and the bell says so.
 *
 * The editor works through the API, where the story needs the shop to change under the guest.
 */
import { searchAndOpenProduct } from '../../../support/e2e/steps';

/** The `localStorage` key the guest cart lives under. */
const GUEST_CART_KEY = 'guest-cart';

/**
 * Signs in through the login form the guest was sent to.
 */
const signInThroughTheForm = (): void => {
    cy.accountOf('user').then(({ email, password }) => {
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').type(email);
        cy.get('[type=password]').clear();
        cy.get('[type=password]').type(password);
        cy.get('form').submit();
    });
};

/**
 * As a guest, opens a seeded product's page from the storefront and adds it to the cart once.
 *
 * @param name - a `product.*` guarantee name
 */
const guestAdds = (name: string): void => {
    cy.visit('/en/products');
    searchAndOpenProduct(name);
    cy.get('[data-test=add-to-cart]').click();
};

describe('CU27 · I filled a cart before I had signed in', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // The customer's own cart may hold lines already; start from empty so a line can only be
        // there because this story put it there.
        cy.apiAs('user', 'DELETE', '/cart/all');
    });

    it('keeps the guest cart through a reload, offers no checkout, and merges it at sign-in', () => {
        cy.subjectProduct('product.inStock').then(({ title }) => {
            cy.step('a guest adds a product: the bar counts it, and the cart page lists it');
            guestAdds('product.inStock');
            cy.get('[data-test=nav-badge]').should('contain.text', '1');
            cy.goToCart();
            cy.get('[data-test=guest-cart-item]').should('have.length', 1);
            cy.contains('[data-test=guest-cart-item]', title).should('exist');

            cy.step("stepping it up changes the browser's copy, and a reload keeps it");
            cy.get('[data-test=guest-cart-increase]').click();
            cy.get('[data-test=guest-cart-item]').should('contain.text', 'Quantity: 2');
            cy.reload();
            cy.get('[data-test=guest-cart-item]').should('contain.text', 'Quantity: 2');
            cy.get('[data-test=nav-badge]').should('contain.text', '2');

            cy.step('there is no checkout for a guest, only a way to sign in and come back');
            cy.get('[data-test=cart-checkout]').should('not.exist');
            cy.get('[data-test=guest-cart-sign-in]').click();
            cy.get('#login-page').should('exist');
            cy.location('search').then((search) => {
                expect(decodeURIComponent(search)).to.include('continue=/en/cart');
            });

            cy.step("signed in, the cart page is the account's, and it holds the guest's lines");
            signInThroughTheForm();
            cy.location('pathname').should('equal', '/en/cart');
            cy.get('[data-test=cart-item]').should('have.length', 1);
            cy.contains('[data-test=cart-item]', title).should('contain.text', 'Quantity: 2');
            cy.window().then((win) => {
                expect(win.localStorage.getItem(GUEST_CART_KEY), 'the browser copy').to.equal(null);
            });
        });
    });

    it("adds the guest's quantity to a line the account already has", () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.subjectProduct('product.inStock').then(({ title }) => {
                cy.step('the account already holds one unit, and the guest adds two');
                cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
                guestAdds('product.inStock');
                cy.get('[data-test=add-to-cart]').click();
                cy.get('[data-test=nav-badge]').should('contain.text', '2');

                cy.step('after sign-in the one line holds the sum');
                cy.get('[data-test=nav-login-link]').click();
                signInThroughTheForm();
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('have.length', 1);
                cy.contains('[data-test=cart-item]', title).should('contain.text', 'Quantity: 3');
            });
        });
    });

    it('leaves out a product pulled while it sat in the guest cart, and says so in the bell', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.subjectProduct('product.inStock').then(({ title }) => {
                cy.step('a guest adds a product, and the editor then takes it off sale');
                guestAdds('product.inStock');
                cy.get('[data-test=nav-badge]').should('contain.text', '1');
                cy.apiAs('editor', 'DELETE', `/products/${productId}`);

                cy.step('signing in does not fail: the line is skipped and the cart is empty');
                cy.get('[data-test=nav-login-link]').click();
                signInThroughTheForm();
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('not.exist');

                cy.step('the bell holds one message naming the product and why');
                cy.get('[data-test=notifications-badge]').should('contain.text', '1');
                cy.get('[data-test=notifications-bell]').click();
                cy.get('[data-test=notifications-panel]').should('contain.text', title);
                cy.get('[data-test=notifications-panel]').should(
                    'contain.text',
                    'could not be added'
                );

                // Leave the shop as found.
                cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
            });
        });
    });
});
