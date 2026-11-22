// requires-module: account, cart, inventory, orders, products, wishlist
/**
 * @module
 * CU6 · Out of stock between wishlist and checkout. A customer holds a product in the cart and saves
 * it to the wishlist too, then the shop's last units of it go (a stocktake correction). The
 * wishlist marks it "Sold out" and moving it adds nothing (it stays saved, with a warning); the cart
 * marks the line "Sold out" and holds "Place order" back. Removing that line lets the rest of the
 * basket through.
 *
 * The server's own refusal (a shortfall the page had not yet seen) is covered by the cart view's
 * stale-refusal spec: the page never offers the click this journey could use to reach it.
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

    it('moves a sold-out product to the cart, finds the line sold out with checkout held back, and buys the rest', () => {
        cy.step(
            'the customer keeps two products in the cart and saves the second to the wishlist too'
        );
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        // A fresh list, so the category filter is gone and the search box finds the second one.
        cy.visit('/en/products');
        searchAndOpenProduct('product.barebones');
        cy.get('[data-test=add-to-cart]').click();
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist').click();
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Saved');

        cy.step('the stocktake finds none left: the admin takes every free unit off the shelf');
        cy.subjectId('product.barebones').then((productId) => {
            cy.apiAs<ProductLike>('admin', 'GET', `/inventory/levels/${productId}`).then(
                (product) => {
                    const free = product?.available ?? 0;
                    expect(free, 'the shelf had units to take').to.be.greaterThan(0);
                    cy.apiAs('admin', 'POST', `/inventory/levels/${productId}/adjust`, {
                        delta: -free,
                        note: 'CU6 stocktake'
                    });
                }
            );
            cy.apiAs<ProductLike>('admin', 'GET', `/inventory/levels/${productId}`).should(
                (product) => {
                    expect(product?.available).to.equal(0);
                }
            );
        });

        cy.step('the wishlist says sold out, and moving it adds nothing: it stays saved');
        cy.subjectProduct('product.barebones').then(({ title }) => {
            cy.visit('/en/wishlist');
            cy.contains('[data-test=wishlist-item]', title)
                .find('[data-test=wishlist-line-availability]')
                .should('have.attr', 'data-availability', 'sold-out');
            cy.contains('[data-test=wishlist-item]', title)
                .find('[data-test=wishlist-move-to-cart]')
                .click();
            cy.contains('[data-test=wishlist-item]', title).should('exist');
            cy.goToCart();
            cy.get('[data-test=cart-item]').should('have.length', 2);

            cy.step('the cart marks the line sold out and holds "Place order" back');
            // `pickup` needs no address, so choosing it alone would enable the button.
            cy.get('[data-test=shipping-method-pickup]').click();
            cy.contains('[data-test=cart-item]', title)
                .find('[data-test=cart-line-availability]')
                .should('contain.text', 'Sold out')
                .and('have.attr', 'data-availability', 'sold-out');
            cy.get('[data-test=cart-lines-need-attention]').should('exist');
            cy.get('[data-test=cart-checkout]').should('be.disabled');
            cy.get('[data-test=checkout-shortfall-line]').should('not.exist');

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
