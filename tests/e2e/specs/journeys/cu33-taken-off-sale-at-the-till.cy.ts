// requires-module: account, cart, inventory, orders, products, wishlist
/**
 * @module
 * CU33 · Taken off sale at the till. A product that cannot be bought right now says so everywhere
 * the shopper meets it: the card, the page, the wishlist and the cart. And when the editor takes a
 * product off sale (or deactivates it) behind an open page, checkout names the line instead of
 * guessing, and the rest of the basket still goes through once that line is removed.
 *
 * The story is about the shop never selling what it cannot. A signed-in cart takes an off-sale
 * line like a sold-out one and holds "Place order" back; only checkout refuses outright.
 */

/** The slice of a cart this story reads. */
interface CartLike {
    items: { productId: string }[];
}

/** The slice of an order list this story counts. */
interface OrdersLike {
    items: unknown[];
}

/** What the shop says where a product cannot be bought right now. */
const NOT_AVAILABLE = 'Not available right now';

/**
 * How many orders the customer holds, so a refusal can be shown to have written none.
 *
 * @returns a chain yielding the count
 */
const ordersHeld = (): Cypress.Chainable<number> =>
    cy
        .apiAs<OrdersLike>('user', 'GET', '/orders?pageSize=50')
        .then((orders) => orders?.items.length ?? 0);

describe('CU33 · Taken off sale at the till', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('an off-sale product says so on its card and page, in the wishlist and in the cart', () => {
        cy.subjectId('product.offSale').then((offSaleId) => {
            cy.subjectProduct('product.offSale').then(({ title }) => {
                cy.step('a guest sees it on its card and cannot add it from its page');
                cy.visit('/en/products');
                cy.get('[data-test=filter-text] input').type(`${title}{enter}`);
                cy.contains('[data-test=product-card]', title)
                    .find('[data-test=product-card-availability]')
                    .should('contain.text', NOT_AVAILABLE);
                cy.visit(`/en/products/${offSaleId}`);
                cy.get('[data-test=product-stock]').should('contain.text', NOT_AVAILABLE);
                cy.get('[data-test=add-to-cart]').should('be.disabled');

                cy.step('saved to the wishlist it carries the same marker');
                cy.loginAs('user');
                cy.apiAs('user', 'PUT', `/wishlist/${offSaleId}`);
                cy.visit('/en/wishlist');
                cy.contains('[data-test=wishlist-item]', title)
                    .find('[data-test=wishlist-line-availability]')
                    .should('have.attr', 'data-availability', 'unavailable');

                cy.step('moved into the cart it holds "Place order" back, until it is removed');
                cy.apiAs('user', 'DELETE', '/cart/all');
                cy.contains('[data-test=wishlist-item]', title)
                    .find('[data-test=wishlist-move-to-cart]')
                    .click();
                cy.goToCart();
                cy.get('[data-test=shipping-method-pickup]').click();
                cy.contains('[data-test=cart-item]', title)
                    .find('[data-test=cart-line-availability]')
                    .should('have.attr', 'data-availability', 'unavailable')
                    .and('contain.text', NOT_AVAILABLE);
                cy.get('[data-test=cart-lines-need-attention]').should('exist');
                cy.get('[data-test=cart-checkout]').should('be.disabled');
                cy.contains('[data-test=cart-item]', title).find('[data-test=cart-remove]').click();
                cy.get('[data-test=cart-item]').should('not.exist');
            });
        });
    });

    it('taken off sale behind an open page, checkout names the line and writes no order', () => {
        cy.subjectId('product.inStock').then((stockedId) => {
            cy.subjectId('product.rich').then((richId) => {
                cy.subjectProduct('product.rich').then(({ title: richTitle }) => {
                    cy.step('the cart holds two lines, pickup chosen, and the page is open');
                    cy.loginAs('user');
                    cy.apiAs('user', 'DELETE', '/cart/all');
                    cy.apiAs('user', 'POST', '/cart', { productId: stockedId, quantity: 1 });
                    cy.apiAs('user', 'POST', '/cart', { productId: richId, quantity: 1 });
                    cy.apiAs('user', 'PUT', '/cart/shipping-method', {
                        shippingMethodId: 'pickup'
                    });
                    cy.goToCart();
                    cy.get('[data-test=cart-item]').should('have.length', 2);
                    cy.get('[data-test=cart-checkout]').should('not.be.disabled');
                    const held = { orders: 0 };
                    ordersHeld().then((count) => {
                        held.orders = count;
                    });

                    cy.step(
                        'the editor takes one off sale; "Place order" names it and writes nothing'
                    );
                    cy.apiAs('editor', 'PATCH', `/products/${richId}`, { purchasable: false });
                    cy.get('[data-test=cart-checkout]').click();
                    // Off sale is judged like sold out: the refusal is the shortfall one, and names it.
                    cy.get('[data-test=checkout-shortfall-line]').should(
                        'contain.text',
                        `${richTitle}: not available right now`
                    );
                    ordersHeld().should((count) => expect(count).to.equal(held.orders));
                    cy.apiAs<CartLike>('user', 'GET', '/cart').should((cart) => {
                        expect(cart?.items, 'both lines are still in the cart').to.have.length(2);
                    });

                    cy.step(
                        'a reload marks the line and holds the button; removing it lets the rest go'
                    );
                    cy.reload();
                    cy.contains('[data-test=cart-item]', richTitle)
                        .find('[data-test=cart-line-availability]')
                        .should('have.attr', 'data-availability', 'unavailable');
                    cy.get('[data-test=cart-checkout]').should('be.disabled');
                    cy.contains('[data-test=cart-item]', richTitle)
                        .find('[data-test=cart-remove]')
                        .click();
                    cy.get('[data-test=cart-item]').should('have.length', 1);
                    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
                    cy.get('#order-target').should('exist');
                    ordersHeld().should((count) => expect(count).to.equal(held.orders + 1));

                    cy.step('the editor puts it back on sale: the marker is gone');
                    cy.apiAs('editor', 'PATCH', `/products/${richId}`, { purchasable: true });
                    cy.apiAs('user', 'POST', '/cart', { productId: richId, quantity: 1 });
                    cy.goToCart();
                    cy.contains('[data-test=cart-item]', richTitle).should('exist');
                    cy.get(
                        '[data-test=cart-line-availability][data-availability=unavailable]'
                    ).should('not.exist');
                });
            });
        });
    });

    it('a product deactivated behind an open page refuses the add, and its lines read "No longer available"', () => {
        cy.subjectId('product.barebones').then((productId) => {
            cy.subjectProduct('product.barebones').then(() => {
                cy.step('the customer has it in the cart and the wishlist, and its page is open');
                cy.loginAs('user');
                cy.apiAs('user', 'DELETE', '/cart/all');
                cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
                cy.apiAs('user', 'PUT', `/wishlist/${productId}`);
                cy.visit(`/en/products/${productId}`);
                cy.get('[data-test=add-to-cart]').should('not.be.disabled');

                cy.step('the editor deactivates it; the add is refused with the server’s sentence');
                cy.apiAs('editor', 'PATCH', `/products/${productId}`, { active: false });
                cy.get('[data-test=add-to-cart]').click();
                cy.get('[data-test=add-to-cart-error]').should('exist');

                cy.step('after a reload both lines read "No longer available"');
                cy.goToCart();
                // A removed line has lost its title, so it is found by its marker, not its name.
                cy.get('[data-test=cart-line-availability][data-availability=removed]')
                    .should('have.length', 1)
                    .and('contain.text', 'No longer available');
                cy.visit('/en/wishlist');
                cy.get('[data-test=wishlist-line-availability][data-availability=removed]')
                    .should('have.length', 1)
                    .and('contain.text', 'No longer available');

                cy.step('the editor reactivates it, so the shop is left as found');
                cy.apiAs('editor', 'PATCH', `/products/${productId}`, { active: true });
            });
        });
    });
});
