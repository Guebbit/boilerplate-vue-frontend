// requires-module: account, cart, inventory, orders, payments, products, wishlist
/**
 * @module
 * CU8 · The product is pulled while I am buying it. The editor takes a product off sale under a
 * customer who is part-way through, and the two ways of doing it end differently.
 *
 * - **Soft delete** (path 1): the product leaves the cart and the wishlist at once, and a later
 *   restore puts the product back on sale but not back in either.
 * - **Deactivation** (path 2): a pending order keeps its line, since it was placed while the
 *   product was sellable, but paying it is refused and the panel names the line.
 *
 * The editor works through the API: it is the cause, and the customer's pages are the subject.
 */
import {
    addOpenProductToCart,
    idFromLocation,
    searchAndOpenProduct
} from '../../../support/e2e/steps';

/** The slice of a cart this story reads: how many lines it holds. */
interface CartLike {
    items: unknown[];
}

describe('CU8 · The product is pulled while I am buying it', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a soft delete takes the line out of the cart and the wishlist, and a restore does not bring it back', () => {
        cy.step('the customer has a product in both the cart and the wishlist');
        cy.loginAs('user');
        cy.subjectId('product.inStock').then((productId) => {
            cy.subjectProduct('product.inStock').then(({ title }) => {
                // The seeded customer already saves this product; the cart is the half to add.
                // Found by title: its category shelf is longer than one page of the list.
                cy.visit('/en/products');
                searchAndOpenProduct('product.inStock');
                addOpenProductToCart();
                cy.visit('/en/wishlist');
                cy.contains('[data-test=wishlist-item]', title).should('exist');
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('have.length', 1);

                cy.step('the editor soft-deletes it: both lines are gone');
                cy.apiAs('editor', 'DELETE', `/products/${productId}`);
                cy.reload();
                cy.get('[data-test=cart-item]').should('not.exist');
                cy.visit('/en/wishlist');
                cy.contains('[data-test=wishlist-item]', title).should('not.exist');

                cy.step('the editor restores it: back on sale, but not back in either place');
                cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
                cy.visit(`/en/products/${productId}`);
                cy.get('#product-target').should('contain.text', title);
                cy.visit('/en/wishlist');
                cy.contains('[data-test=wishlist-item]', title).should('not.exist');
                cy.apiAs<CartLike>('user', 'GET', '/cart').should((cart) => {
                    expect(cart?.items, 'the cart stays empty').to.have.length(0);
                });
                cy.goToCart();
                cy.get('[data-test=cart-item]').should('not.exist');
            });
        });
    });

    it('a deactivated product keeps its pending order but refuses the payment, naming the line', () => {
        cy.step('the customer places an order and has not paid yet');
        cy.loginAs('user');
        cy.subjectId('product.barebones').then((productId) => {
            cy.subjectProduct('product.barebones').then(({ title }) => {
                // Found by title: this product has no category to narrow the list by.
                cy.visit('/en/products');
                searchAndOpenProduct('product.barebones');
                addOpenProductToCart();
                cy.goToCart();
                // `pickup` needs no address, so choosing it alone enables the button.
                cy.get('[data-test=shipping-method-pickup]').click();
                cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                cy.get('#order-target').should('exist');
                cy.get('[data-test=payment-method-select]').should('exist');

                cy.step('the editor deactivates the product');
                cy.apiAs('editor', 'PATCH', `/products/${productId}`, { active: false });

                cy.step('paying is refused, naming the product; the order itself stays pending');
                cy.payWith('Card that pays');
                cy.get('[data-test=payment-unavailable]').should('exist');
                cy.get('[data-test=payment-unavailable-line]')
                    .should('have.length', 1)
                    .and('contain.text', title);
                cy.get('[data-test=order-download-invoice]').should('not.exist');
                idFromLocation().then((orderId) => {
                    cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should(
                        (order) => {
                            expect(order?.status).to.equal('pending');
                        }
                    );
                });
            });
        });
    });
});
