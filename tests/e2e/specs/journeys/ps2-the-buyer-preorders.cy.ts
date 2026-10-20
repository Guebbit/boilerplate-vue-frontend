// requires-module: account, cart, inventory, orders, products
/**
 * @module
 * PS2 · The buyer preorders. A product with a release date ahead, and room in its preorder
 * allowance, is bought like any other: the page offers "Preorder", the cart says so on the line,
 * and the placed order names the date it ships from. Nothing is held on a shelf: a preorder is an
 * allowance, which only the admin opens (`PUT /inventory/levels/{id}/backorder-limit`).
 *
 * When the one place in the allowance is taken and paid for, the next shopper is told it is out of
 * stock instead of being offered a preorder that the cart would then refuse.
 *
 * Written against the live pages and not yet run in a browser: the first run may need its
 * selectors nudged.
 */
import {
    checkoutAs,
    createProductThroughTheForm,
    preorderOnSale,
    releaseDateIn,
    addOpenProductToCart
} from '../../../support/e2e/steps';

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** The slice of an order this story reads. */
interface OrderLike {
    id: string;
    items: { product: { preorder?: boolean } }[];
}

describe('PS2 · The buyer preorders', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('is offered Preorder, sees it in the cart and reads the date on the order', () => {
        cy.step('the editor makes the preorder, and the admin opens its allowance');
        cy.loginAs('editor');
        createProductThroughTheForm(`PS2 preorder ${unique()}`, releaseDateIn(60)).then((id) => {
            cy.apiAs('admin', 'PUT', `/inventory/levels/${id}/backorder-limit`, {
                backorderLimit: 5
            });

            cy.step('the customer is offered Preorder, with the date');
            cy.switchUser('user');
            cy.visit(`/en/products/${id}`);
            cy.get('[data-test=add-to-cart]').should('contain.text', 'Preorder').and('be.enabled');
            cy.get('[data-test=product-release-date]').should('exist');

            cy.step('the cart line says it is a preorder');
            addOpenProductToCart();
            cy.visit('/en/cart');
            cy.get('[data-test=cart-item]').should('have.length', 1);
            cy.get('[data-test=cart-line-availability]').should('contain.text', 'Preorder');

            cy.step('the order is placed and names the date it ships from');
            cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
            checkoutAs<OrderLike>('user').then((order) => {
                expect(order?.items[0]?.product.preorder).to.equal(true);
                cy.visit(`/en/orders/${String(order?.id)}`);
                cy.get('[data-test=order-item-preorder]').should('contain.text', 'ships from');
            });
        });
    });

    it('tells the next shopper "Out of stock" once the allowance is taken', () => {
        cy.step('a preorder with room for one, and one shopper takes the place and pays');
        preorderOnSale({ releaseInDays: 60, limit: 1 }).then((id) => {
            cy.apiAs('user', 'POST', '/cart', { productId: id, quantity: 1 });
            cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
            checkoutAs<OrderLike>('user').then((order) => {
                cy.apiAs('admin', 'POST', `/payments/order/${String(order?.id)}/offline`, {
                    method: 'cash'
                });
            });

            cy.step('the next shopper reads "Out of stock" on a disabled button');
            cy.loginAs('support');
            cy.visit(`/en/products/${id}`);
            cy.get('[data-test=add-to-cart]')
                .should('contain.text', 'Out of stock')
                .and('be.disabled');
        });
    });
});
