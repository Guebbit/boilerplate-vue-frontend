// requires-module: account, cart, delivery, inventory, orders, products
/**
 * @module
 * CU10 · A digital product, alone and mixed. A video course ships nothing, so a basket holding only
 * that asks for no shipping method, no address and charges no delivery. Put a physical product beside
 * it and delivery comes back — priced on the physical line only, never on the course.
 *
 * The physical line is the made-to-order bowl (`product.noWithdrawal`, EU Art. 16(c)), so the same
 * order also proves that line carries its no-withdrawal notice and the digital one does not. Nothing
 * is paid: the story stops at the orders the checkout writes.
 *
 * The proof that delivery ignores the course is the threshold: bowl 80 plus course 29 is 109, past
 * standard's free-from-100 line, yet delivery is still charged because the bowl alone is under it.
 */
import {
    addToCartFromStorefront,
    cents,
    centsOf,
    idFromLocation
} from '../../../support/e2e/steps';

/** The slice of an order this story reads: what it was charged for, and how it was to be sent. */
interface OrderLike {
    shippingCost?: number | null;
    shippingMethod?: string | null;
    items: unknown[];
}

describe('CU10 · A digital product, alone and mixed', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a course alone ships nothing; beside a physical line only that line is shipped and priced', () => {
        cy.step('the customer puts the digital course alone in the cart');
        cy.loginAs('user');
        // The seeded customer's cart still remembers the shipping method of their last checkout,
        // and checkout refuses that method on a basket with nothing to ship (409, with no control
        // on the page to clear it). The story starts from a cart with no method chosen.
        cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: null });
        addToCartFromStorefront('product.digital');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);

        cy.step('no shipping step, no address, no delivery cost: the basket can be bought at once');
        cy.get('[data-test=cart-summary]').should('exist');
        // The selector's own heading still renders, but with no method to choose from.
        cy.get('[data-test^=shipping-method-]').should('not.exist');
        cy.get('[data-test=address-picker]').should('not.exist');
        cy.get('[data-test=cart-shipping-cost]').should('not.exist');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();

        // The order does still freeze the account's default address ("rides on the order unused",
        // BE `cart/services/checkout.ts`), so this step asserts the method and cost, not the address.
        cy.step('the order carries no delivery at all, and no no-withdrawal notice');
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-item-line-total]').should('have.length', 1);
        cy.get('[data-test=order-shipping]').should('not.exist');
        cy.get('[data-test=order-item-no-withdrawal]').should('not.exist');
        idFromLocation().then((orderId) => {
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.shippingMethod ?? null, 'nothing to ship by').to.equal(null);
                expect(order?.shippingCost ?? 0, 'nothing to charge for').to.equal(0);
            });
        });

        cy.step('the customer now buys the course together with the made-to-order bowl');
        addToCartFromStorefront('product.noWithdrawal');
        addToCartFromStorefront('product.digital');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 2);

        cy.step('shipping is back: standard, to the default address, past the free-shipping line');
        cy.get('[data-test=shipping-method-standard]').click();
        cy.get('[data-test=address-picker]').should('exist');
        // Bowl 80 plus course 29: the basket as a whole is past standard's free-from-100 line.
        centsOf('[data-test=cart-items-total]').should('be.greaterThan', cents('100.00'));
        // Forced: the toasts of the two add-to-carts sit over the foot of the page, and the button
        // is at the foot. `not.be.disabled` still guards it.
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click({ force: true });

        cy.step(
            'the order froze that delivery, and only the bowl says it cannot be withdrawn from'
        );
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-item-line-total]').should('have.length', 2);
        cy.get('[data-test=order-shipping]').should('exist');
        cy.get('[data-test=order-shipping-address]').should('exist');
        cy.get('[data-test=order-item-no-withdrawal]').should('have.length', 1);
        // What the order charges is the authority on delivery. The cart's own preview prices it on
        // every line, course included, so it reads free here and is not compared.
        centsOf('[data-test=order-shipping]').should('equal', cents('5.00'));
        idFromLocation().then((orderId) => {
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.shippingMethod).to.equal('standard');
                expect(order?.items).to.have.length(2);
            });
        });
    });
});
