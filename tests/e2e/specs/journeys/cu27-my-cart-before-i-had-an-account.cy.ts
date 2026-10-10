// requires-module: account, cart, notifications, products
/**
 * @module
 * CU27 · I filled a cart before I had signed in. A guest adds to a cart kept in the browser, steps
 * it, reloads and still has it; checking out is not offered until they sign in. Signing in merges
 * the cart into the account's: lines add up, and a line the shop can no longer sell is left out
 * with a message in the bell instead of a lost cart. Whatever did not land as the guest chose, or
 * is short of stock, is told once, on the cart page, in an alert that goes when it is closed or the
 * page is reloaded.
 *
 * - **Kept**: the guest cart survives a reload, and checkout is gated.
 * - **Merged**: after sign-in the lines are in the account's cart and the browser's copy is gone;
 *   a line that landed as chosen has no alert.
 * - **Summed**: a product already in the account's cart grows by the guest's quantity, and the alert
 *   says what was chosen and what the cart holds now. Closing it keeps it closed.
 * - **Refused**: a product pulled while it sat in the guest cart is skipped; the alert and the bell
 *   both say so, and a reload takes the alert (not the bell message) away.
 * - **Short**: more units than are for sale are merged anyway, at the quantity chosen, and flagged:
 *   the alert and the cart line both say "not enough in stock" without a number, a reload takes the
 *   alert away but the line keeps its flag (the server's), and lowering the line clears it.
 *
 * The editor works through the API, where the story needs the shop to change under the guest.
 */
import { GUEST_CART_KEY, searchAndOpenProduct, submitLoginForm } from '../../../support/e2e/steps';

/** The merge alert on the cart page, and the one control that closes it. */
const MERGE_ALERT = '[data-test=cart-merge-report]';
const MERGE_ALERT_CLOSE = `${MERGE_ALERT} button[aria-label=Dismiss]`;

/**
 * Signs in through the login form the guest was sent to.
 */
const signInThroughTheForm = (): void => {
    cy.accountOf('user').then(({ email, password }) => {
        submitLoginForm(email, password);
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
            cy.get(MERGE_ALERT).should('not.exist');
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

                cy.step(
                    'the alert names the product, what the guest chose and what the cart holds'
                );
                cy.get(MERGE_ALERT).should('be.visible');
                cy.get(`${MERGE_ALERT} [data-test=cart-merge-report-line]`)
                    .should('have.length', 1)
                    .and('contain.text', title)
                    .and('contain.text', 'you chose 2, your cart now has 3')
                    .and('contain.text', 'already held some of it');
                cy.checkPageA11y('cart with the merge alert');

                cy.step(
                    'closing it keeps it closed, here and after leaving the page and coming back'
                );
                cy.get(MERGE_ALERT_CLOSE).click();
                cy.get(MERGE_ALERT).should('not.exist');
                cy.navigateTo('/en/products');
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('have.length', 1);
                cy.get(MERGE_ALERT).should('not.exist');
            });
        });
    });

    it('leaves out a product pulled while it sat in the guest cart, and says so in the bell', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.subjectProduct('product.inStock').then(({ title }) => {
                cy.step('a guest adds a product, and the editor then takes it off sale');
                guestAdds('product.inStock');
                cy.get('[data-test=nav-badge]').should('contain.text', '1');
                // The seeded customer also saves this product, and deleting it tells them about
                // the wishlist line too; take it off the list so the bell holds the merge's message only.
                cy.apiAs('user', 'DELETE', `/wishlist/${productId}`);
                cy.apiAs('editor', 'DELETE', `/products/${productId}`);

                cy.step('signing in does not fail: the line is skipped and the cart is empty');
                cy.get('[data-test=nav-login-link]').click();
                signInThroughTheForm();
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('not.exist');

                cy.step(
                    'the alert says nothing was added, with a generic name for a product it cannot read'
                );
                cy.get(`${MERGE_ALERT} [data-test=cart-merge-report-line]`)
                    .should('have.length', 1)
                    .and('contain.text', 'you chose 1, your cart now has 0')
                    .and('contain.text', 'no longer available');

                cy.step('the bell holds one message naming the product and why');
                cy.get('[data-test=notifications-badge]').should('contain.text', '1');
                cy.get('[data-test=notifications-bell]').click();
                cy.get('[data-test=notifications-panel]').should('contain.text', title);
                cy.get('[data-test=notifications-panel]').should(
                    'contain.text',
                    'no longer available and were not added'
                );

                cy.step('a reload takes the alert away: the bell message is what remembers');
                cy.reload();
                cy.get('#cart-page').should('exist');
                cy.get(MERGE_ALERT).should('not.exist');
                cy.get('[data-test=notifications-bell]').click();
                cy.get('[data-test=notifications-panel]').should('contain.text', title);

                // Leave the shop as found.
                cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
            });
        });
    });

    it('keeps a line the stock does not cover at the quantity chosen, flags it, and clears the flag once it is lowered', () => {
        cy.subjectProduct('product.lowStock').then(({ title }) => {
            cy.step('one unit is for sale, and the guest chooses two');
            guestAdds('product.lowStock');
            cy.get('[data-test=add-to-cart]').click();
            cy.get('[data-test=nav-badge]').should('contain.text', '2');

            cy.step('signing in keeps both units: the merge never lowers a line for stock');
            cy.get('[data-test=nav-login-link]').click();
            signInThroughTheForm();
            cy.goToCart();
            cy.get('[data-test=cart-item]').should('have.length', 1);
            cy.contains('[data-test=cart-item]', title).should('contain.text', 'Quantity: 2');

            cy.step('the alert marks it short and says to lower it, with no stock number');
            cy.get(`${MERGE_ALERT} [data-test=cart-merge-report-line]`)
                .should('have.length', 1)
                .and('contain.text', title)
                .and('contain.text', 'you chose 2, your cart now has 2')
                .and('contain.text', 'Lower the quantity before checkout')
                .invoke('text')
                .should((text) => {
                    expect(text.match(/\d+/g), 'only the two quantities').to.deep.equal(['2', '2']);
                });
            cy.get(`${MERGE_ALERT} [data-test=cart-merge-report-short]`).should(
                'contain.text',
                'Not enough in stock'
            );

            cy.step('the cart line carries the same marker, in words');
            cy.get('[data-test=cart-line-availability]')
                .should('have.length', 1)
                .and('contain.text', 'Not enough in stock');
            cy.checkPageA11y('cart with a short line and the merge alert');

            cy.step('a reload takes the alert away, and the line keeps the server flag');
            cy.reload();
            cy.get('#cart-page').should('exist');
            cy.get(MERGE_ALERT).should('not.exist');
            cy.get('[data-test=cart-line-availability]').should('have.length', 1);

            cy.step('lowering it to what is for sale clears the marker');
            cy.get('[data-test=cart-decrease]').click();
            cy.contains('[data-test=cart-item]', title).should('contain.text', 'Quantity: 1');
            cy.get('[data-test=cart-line-availability]').should('not.exist');
        });
    });
});
