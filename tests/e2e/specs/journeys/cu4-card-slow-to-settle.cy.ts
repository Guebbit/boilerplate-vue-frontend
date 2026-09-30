// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU4 · A card that is slow to settle. Some payments are not answered on the spot: a bank debit
 * takes days. The provider says "processing", and the page has to be honest about it: not paid
 * (there is no invoice, no parcel to pack), not failed (the card form does not come back to
 * invite a second charge), but waiting, with one button to ask the provider again.
 *
 * Two stories, since the ending can go two ways:
 * - The money lands while the order waits: Finish reads the provider, and the order is paid.
 * - The customer cancels while it is still processing and the money lands anyway: the shop never
 *   keeps it. The payment ends `refunded`, the order stays cancelled, and Finish says so
 *   (`payments/services/settlement.ts`, the "order lost" branch).
 *
 * Each spends one card confirm, as `user`.
 */
import { addToCartFromStorefront, eventually, idFromLocation } from '../../../support/e2e/steps';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    status: string;
    amount: number;
    amountRefunded: number;
}

/**
 * Checks out a seeded product by card and submits the slow method, leaving the customer on the
 * order page with the payment in flight.
 *
 * @returns a chain yielding the order's id
 */
const payWithSlowCard = (): Cypress.Chainable<string> => {
    cy.loginAs('user');
    addToCartFromStorefront('product.rich');
    cy.goToCart();
    // `pickup` needs no address, so the method alone enables the button.
    cy.get('[data-test=shipping-method-pickup]').click();
    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
    cy.get('#order-target').should('exist');
    cy.payWith('Method that settles later');
    return idFromLocation();
};

describe('CU4 · A card that is slow to settle', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('waits honestly while the provider is working, and the order is paid once Finish reads its answer', () => {
        cy.step('the customer pays with a method that settles later');
        payWithSlowCard().then((orderId) => {
            cy.step('the page says it is waiting: not paid, not failed, one button to ask again');
            cy.get('[data-test=payment-finish]').should('exist');
            cy.get('[data-test=payment-status]').should('contain.text', 'Processing');
            cy.get('[data-test=payment-method-select]').should('not.exist');
            cy.get('[data-test=order-download-invoice]').should('not.exist');
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status, 'nothing is paid yet').to.equal('pending');
            });
            cy.reload();
            cy.get('[data-test=payment-finish]').should('exist');

            cy.step('Finish asks the provider again, and the order is paid');
            cy.get('[data-test=payment-finish]').click();
            cy.get('[data-test=payment-finish]').should('not.exist');
            cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
            cy.get('[data-test=order-download-invoice]').should('exist');
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status).to.equal('paid');
            });
            cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`).should((payment) => {
                expect(payment?.status).to.equal('succeeded');
            });
        });
    });

    it('refunds money that lands after the customer cancelled, and never keeps it', () => {
        cy.step('the customer pays with a slow method, then cancels while it is processing');
        payWithSlowCard().then((orderId) => {
            cy.get('[data-test=payment-finish]').should('exist');
            cy.get('[data-test=order-cancel]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=order-cancel]').should('not.exist');
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status).to.equal('cancelled');
            });

            cy.step('the money lands anyway: Finish is refused, and the payment is refunded');
            cy.get('[data-test=payment-finish]').click();
            eventually(
                () => cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`),
                (payment) => payment?.status === 'refunded'
            ).should((payment) => {
                expect(payment?.status).to.equal('refunded');
                expect(payment?.amountRefunded).to.equal(payment?.amount);
            });
            cy.get('[data-test=payment-panel-error]').should('exist');
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status, 'the late money did not revive the order').to.equal(
                    'cancelled'
                );
            });
            cy.reload();
            cy.get('[data-test=payment-status]').should('contain.text', 'Refunded');
            cy.get('[data-test=order-download-invoice]').should('not.exist');
        });
    });
});
