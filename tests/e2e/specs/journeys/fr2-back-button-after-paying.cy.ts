// requires-module: account, cart, orders, payments, products
/**
 * @module
 * FR2 · The Back button after paying. A customer pays by card and, as people do, presses Back,
 * then Forward, then reloads. The cart they just checked out must not come back to life (Back goes to
 * the cart page, and it is empty), the order page must still say paid and offer no way to pay again,
 * and the API must still hold exactly one settled payment for the order.
 *
 * It spends one card confirmation of the customer's hourly budget, like any paying journey.
 */
import { idFromLocation } from '../../../support/e2e/steps';

/** The slice of a payment this story reads: where the money stands. */
interface PaymentLike {
    status: string;
    amount: number;
}

describe('FR2 · The Back button after paying', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // The customer's own cart may hold lines already; start from empty so the one line is ours.
        cy.apiAs('user', 'DELETE', '/cart/all');
        cy.visit('/en');
    });

    it('leaves an empty cart, a paid order with no second payment, and the same after a reload', () => {
        cy.step('the customer puts one product in the cart and checks out by pickup');
        cy.loginAs('user');
        cy.subjectId('product.inStock').then((productId) => {
            cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
        });
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        // `pickup` needs no address, so the method alone enables the button.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');

        cy.step('pays by card');
        cy.payWith('Card that pays');
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
        cy.get('[data-test=payment-submit]').should('not.exist');

        idFromLocation().then((orderId) => {
            cy.step('Back lands on the cart, and it is empty: nothing left to check out');
            cy.go('back');
            cy.get('#cart-page').should('exist');
            cy.get('[data-test=cart-item]').should('not.exist');
            cy.get('[data-test=cart-checkout]').should('not.exist');
            cy.get('[data-test=pinned-Cart] [data-test=nav-badge]').should('not.exist');

            cy.step('Forward returns to the order, still paid, with no second payment on offer');
            cy.go('forward');
            cy.location('pathname').should('equal', `/en/orders/${orderId}`);
            cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
            cy.get('[data-test=payment-submit]').should('not.exist');
            cy.get('[data-test=payment-method-select]').should('not.exist');

            cy.step('a reload changes nothing, and the API holds one settled payment');
            cy.reload();
            cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
            cy.get('[data-test=payment-submit]').should('not.exist');
            cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`).should((payment) => {
                expect(payment?.status).to.equal('succeeded');
            });
            cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status).to.equal('paid');
            });
            cy.apiAs<{ items: unknown[] }>('user', 'GET', '/cart').should((cart) => {
                expect(cart?.items ?? []).to.have.length(0);
            });
        });
    });
});
