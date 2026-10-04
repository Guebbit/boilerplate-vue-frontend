// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * CU7 · Two shoppers, one last unit. Both have the last unit of a product in their cart. The
 * customer checks out first, which holds it; the second shopper is refused, naming the shortfall.
 * When the customer cancels, the hold is released and the second shopper's next attempt goes through.
 *
 * The second shopper is the seeded second-shopper customer: staff hold no
 * shopping key, and its address book carries the billing address the invoice needs. Both shoppers also
 * read the product page's count along the way: it follows the hold and the release, because every
 * stock write clears the server cache and the browser revalidates the page.
 */
import { addToCartFromStorefront, idFromLocation } from '../../../support/e2e/steps';

/** The slice of a product this story reads: the units a shopper could still buy. */
interface ProductLike {
    available: number;
}

/**
 * Asserts the units a shopper could buy right now, read as the admin.
 *
 * @param productId - the product to read
 * @param units - how many are expected to be free
 */
const expectAvailable = (productId: string, units: number): void => {
    cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).should((product) => {
        expect(product?.available, `${String(units)} free`).to.equal(units);
    });
};

describe('CU7 · Two shoppers, one last unit', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the second shopper is refused while the hold stands, and served once it is released', () => {
        cy.subjectId('product.lowStock').then((productId) => {
            cy.subjectProduct('product.lowStock').then(({ title }) => {
                cy.step('both shoppers have the last unit in their cart');
                expectAvailable(productId, 1);
                cy.loginAs('user');
                addToCartFromStorefront('product.lowStock');
                // Adding never looks at stock, so the second shopper's cart can hold it too.
                cy.apiAs('secondShopper', 'POST', '/cart', { productId, quantity: 1 });

                cy.step('the customer checks out the last unit: it is held');
                cy.goToCart();
                // `pickup` needs no shipping address, and the customer's default bills, so choosing
                // it alone enables the button.
                cy.get('[data-test=shipping-method-pickup]').click();
                cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                cy.get('#order-target').should('exist');
                expectAvailable(productId, 0);
                idFromLocation().then((orderId) => {
                    cy.step("the customer's own page for it now says out of stock");
                    cy.visit(`/en/products/${productId}`);
                    cy.get('[data-test=product-stock]').should('contain.text', 'Out of stock');

                    cy.step(
                        'the second shopper sees it gone, and checkout refuses with the shortfall'
                    );
                    cy.switchUser('secondShopper');
                    cy.visit(`/en/products/${productId}`);
                    cy.get('[data-test=product-stock]').should('contain.text', 'Out of stock');
                    cy.goToCart();
                    cy.get('[data-test=cart-item]').should('have.length', 1);
                    cy.get('[data-test=shipping-method-pickup]').click();
                    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                    cy.get('[data-test=checkout-shortfall-line]')
                        .should('have.length', 1)
                        .invoke('text')
                        .should((text) => {
                            expect(text).to.contain(title);
                            expect(text, 'one asked for, none left').to.match(/\b1\b.*\b0\b/);
                        });
                    cy.get('#cart-page').should('exist');

                    cy.step('the customer cancels: the hold is released');
                    cy.switchUser('user');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=order-cancel]').click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=order-cancel]').should('not.exist');
                    expectAvailable(productId, 1);
                    cy.visit(`/en/products/${productId}`);
                    cy.get('[data-test=product-stock]').should('not.contain.text', 'Out of stock');

                    cy.step('the second shopper tries again and gets it');
                    cy.switchUser('secondShopper');
                    cy.visit(`/en/products/${productId}`);
                    cy.get('[data-test=product-stock]').should('not.contain.text', 'Out of stock');
                    cy.goToCart();
                    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                    cy.get('#order-target').should('exist');
                    expectAvailable(productId, 0);
                });
            });
        });
    });
});
