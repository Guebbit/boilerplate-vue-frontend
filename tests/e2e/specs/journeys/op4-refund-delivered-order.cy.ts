// requires-module: account, orders, payments
/**
 * @module
 * OP4 · A return: refund a delivered order. A moderator may refund money (`payments.any.update`)
 * but the parcel is long delivered, so the order must stay as it is: the refund moves the money
 * and nothing else. A delivered order cannot be cancelled, and the page says so by leaving both
 * cancel buttons shut while "refund only" is open.
 *
 * The customer is the witness: their own order page shows the refund and the credit note that
 * goes with it. The order is `order.delivered`, paid by card weeks ago, so nothing is spent.
 */
import { eventually } from '../../../support/e2e/steps';

/** The slice of a payment this story reads: where the money stands. */
interface PaymentLike {
    status: string;
    amount: number;
    amountRefunded: number;
}

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/** A credit note, as far as this story cares: that it is listed. */
interface CreditNoteLike {
    grandTotal: number;
}

describe('OP4 · A return: refund a delivered order', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refunds the money and leaves the delivered order alone, and the customer sees it', () => {
        cy.subjectId('order.delivered').then((orderId) => {
            cy.step('the moderator opens the order: only the refund is offered');
            cy.loginAs('moderator');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-refund-only]').should('not.be.disabled');
            cy.get('[data-test=button-cancel-only]').should('be.disabled');
            cy.get('[data-test=button-cancel-and-refund]').should('be.disabled');
            cy.apiAs<PaymentLike>('moderator', 'GET', `/payments/order/${orderId}`).should(
                (payment) => {
                    expect(payment?.status).to.equal('succeeded');
                    expect(payment?.amountRefunded).to.equal(0);
                }
            );

            cy.step('refund only: the money goes back');
            cy.get('[data-test=button-refund-only]').click();
            cy.get('[data-test=order-edit-actions-error]').should('not.exist');
            cy.get('[data-test=button-refund-only]').should('be.disabled');
            cy.apiAs<PaymentLike>('moderator', 'GET', `/payments/order/${orderId}`).should(
                (payment) => {
                    expect(payment?.status).to.equal('refunded');
                    expect(payment?.amountRefunded).to.equal(payment?.amount);
                }
            );

            cy.step('the order itself did not move, and a credit note was issued');
            cy.apiAs<OrderLike>('moderator', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status).to.equal('delivered');
            });
            eventually(
                () =>
                    cy.apiAs<CreditNoteLike[]>(
                        'moderator',
                        'GET',
                        `/orders/${orderId}/credit-notes`
                    ),
                (notes) => (notes?.length ?? 0) > 0
            ).should((notes) => {
                expect(notes).to.have.length(1);
            });

            cy.step('the customer sees the refund on their own order');
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=payment-status]').should('contain.text', 'Refunded');
            cy.get('[data-test=order-fulfillment-status]').should('exist');
            cy.get('[data-test=order-credit-note-row]').should('have.length', 1);
        });
    });
});
