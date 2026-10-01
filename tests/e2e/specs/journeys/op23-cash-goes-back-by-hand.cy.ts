// requires-module: account, orders, payments
/**
 * @module
 * OP23 · Cash goes back by hand. An order paid in cash has no provider to ask for the money back,
 * so cancelling it leaves a debt the shop has to settle itself, and the page says so. The moderator
 * records that they did (`payment-refunded-by-hand`), and nothing is sent to any provider.
 *
 * The invoice outlives all of it: it is the record of the sale, and stays downloadable after the
 * cancel and after the refund, while a credit note joins it. One download is enough: the invoicing
 * budget is spent per download, and the story is the money, not the PDF.
 */
import { eventually } from '../../../support/e2e/steps';

/** The slice of a payment this story reads: the method, and where the money stands. */
interface PaymentLike {
    method: string;
    status: string;
    amountRefunded: number;
    refundedByHand?: boolean;
}

/** A credit note, as far as this story cares: that it is listed. */
interface CreditNoteLike {
    grandTotal: number;
}

describe('OP23 · Cash goes back by hand', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('cancels the cash order, owes the money, records the hand refund and keeps the invoice', () => {
        cy.subjectId('order.paidOffline').then((orderId) => {
            cy.step('the moderator opens the cash order and downloads its invoice');
            cy.loginAs('moderator');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=payment-offline-detail]').should('exist');
            cy.intercept('GET', '**/orders/*/invoice').as('invoice');
            cy.get('[data-test=order-download-invoice]').click();
            cy.wait('@invoice').then(({ response }) => {
                expect(response?.statusCode).to.equal(200);
                expect(response?.headers['content-type']).to.contain('application/pdf');
            });

            cy.step(
                'cancel only: the cash is still counted as taken, and the page says it is owed'
            );
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-cancel-only]').should('not.be.disabled').click();
            cy.get('[data-test=button-cancel-only]').should('be.disabled');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=payment-refund-pending]').should('exist');
            cy.get('[data-test=payment-refunded-by-hand]').should('not.exist');

            cy.step('refund only: recorded by hand, with no provider to call');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-refund-only]').should('not.be.disabled').click();
            cy.get('[data-test=button-refund-only]').should('be.disabled');
            cy.get('[data-test=order-edit-actions-error]').should('not.exist');
            cy.apiAs<PaymentLike>('moderator', 'GET', `/payments/order/${orderId}`).should(
                (payment) => {
                    expect(payment?.method).to.not.equal('card');
                    expect(payment?.status).to.equal('refunded');
                    expect(payment?.refundedByHand).to.equal(true);
                }
            );
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=payment-refunded-by-hand]').should('exist');
            cy.get('[data-test=payment-refund-pending]').should('not.exist');
            cy.get('[data-test=payment-offline-detail]').should('exist');

            cy.step('a credit note joins the invoice, and the invoice still downloads');
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
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-credit-note-row]').should('have.length', 1);
            cy.get('[data-test=order-download-invoice]').should('exist');
        });
    });
});
