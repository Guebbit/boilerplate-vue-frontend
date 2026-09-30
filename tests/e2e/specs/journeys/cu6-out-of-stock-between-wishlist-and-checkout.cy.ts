// requires-module: account, cart, inventory, orders, products, wishlist
/**
 * @module
 * CU6 · Out of stock between wishlist and checkout. A customer saves a product, the shop's last
 * units of it go (a stocktake correction), and the customer moves it to the cart anyway. Adding
 * to a cart never looks at stock — only checkout does — so the move works and checkout refuses,
 * naming the line and how many are left. Removing that line lets the rest of the basket through.
 *
 * The shortfall line is checked for what it must carry, not for its wording: the product's title
 * and the two numbers, requested and available.
 */
import {
    addToCartFromStorefront,
    idFromLocation,
    searchAndOpenProduct
} from '../../../support/e2e/steps';

/** The slice of a product this story reads: the units a customer could still buy. */
interface ProductLike {
    available: number;
}

describe('CU6 · Out of stock between wishlist and checkout', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('moves a sold-out product to the cart, is refused at checkout with the shortfall, and buys the rest', () => {
        cy.step(
            'the customer keeps an ordinary product in the cart and saves another to the wishlist'
        );
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        // A fresh list, so the category filter is gone and the search box finds the second one.
        cy.visit('/en/products');
        searchAndOpenProduct('product.barebones');
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist').click();
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Saved');

        cy.step('the stocktake finds none left: the admin takes every free unit off the shelf');
        cy.subjectId('product.barebones').then((productId) => {
            cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).then((product) => {
                const free = product?.available ?? 0;
                expect(free, 'the shelf had units to take').to.be.greaterThan(0);
                cy.apiAs('admin', 'POST', '/inventory/adjustments', {
                    productId,
                    delta: -free,
                    note: 'CU6 stocktake'
                });
            });
            cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).should((product) => {
                expect(product?.available).to.equal(0);
            });
        });

        cy.step('moving it to the cart still works: adding never looks at stock');
        cy.subjectProduct('product.barebones').then(({ title }) => {
            cy.visit('/en/wishlist');
            cy.contains('[data-test=wishlist-item]', title)
                .find('[data-test=wishlist-move-to-cart]')
                .click();
            cy.contains('[data-test=wishlist-item]', title).should('not.exist');
            cy.goToCart();
            cy.get('[data-test=cart-item]').should('have.length', 2);

            cy.step('checkout refuses, naming the line, what was asked and what is left');
            // `pickup` needs no address, so choosing it alone enables the button.
            cy.get('[data-test=shipping-method-pickup]').click();
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('[data-test=checkout-shortfall-line]').should('have.length', 1);
            cy.get('[data-test=checkout-shortfall-line]')
                .invoke('text')
                .should((text) => {
                    expect(text).to.contain(title);
                    expect(text, 'one asked for, none left').to.match(/\b1\b.*\b0\b/);
                });
            cy.get('#cart-page').should('exist');

            cy.step('the customer removes that line and the rest of the basket goes through');
            cy.contains('[data-test=cart-item]', title).find('[data-test=cart-remove]').click();
            cy.get('[data-test=cart-item]').should('have.length', 1);
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('#order-target').should('exist');
            idFromLocation().then((orderId) => {
                cy.apiAs<{ items: unknown[] }>('user', 'GET', `/orders/${orderId}`).should(
                    (order) => {
                        expect(order?.items, 'only the ordinary product was bought').to.have.length(
                            1
                        );
                    }
                );
            });
        });
    });
});
