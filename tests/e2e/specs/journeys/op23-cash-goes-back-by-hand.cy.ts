// requires-module: account, orders, payments
/**
 * @module
 * OP23 · Cash goes back by hand. An order paid in cash has no provider to ask for the money back,
 * so cancelling it with a refund only OPENS the refund: it stays pending, the page says it is owed,
 * and nobody but an operator can say the cash went back. The moderator hands it back, presses
 * "Mark returned", and only then does the payment read refunded by hand. Nothing is sent to any
 * provider.
 *
 * The invoice outlives all of it: it is the record of the sale, and stays downloadable after the
 * cancel and after the refund, while a credit note joins it. One download is enough: the invoicing
 * budget is spent per download, and the story is the money, not the PDF.
 */
import { eventually, paymentOfOrder } from '../../../support/e2e/steps';

/** The slice of a payment this story reads: the method, and where the money stands. */
interface PaymentLike {
    displayStatus?: string;
    method: string;
    status: string;
    amountRefunded: number;
    refunds: { settledByHand?: boolean }[];
    actions: { refund: boolean; settleByHand: string[] };
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

    it('cancels the cash order, owes the money, marks it returned by hand and keeps the invoice', () => {
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

            cy.step('cancel and refund: the order is cancelled and the cash is owed back');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-cancel-and-refund]').should('not.be.disabled').click();
            cy.get('[data-test=button-cancel-and-refund]').should('be.disabled');
            eventually(
                () => paymentOfOrder<PaymentLike>('moderator', orderId),
                (payment) => payment?.displayStatus === 'refund_pending'
            ).should((payment) => {
                expect(payment?.method).to.not.equal('card');
                expect(payment?.refunds[0]?.settledByHand, 'nobody has confirmed it yet').to.equal(
                    undefined
                );
                expect(payment?.actions.settleByHand).to.have.length(1);
            });
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=payment-refund-pending]').should('exist');
            cy.get('[data-test=payment-refunded-by-hand]').should('not.exist');

            cy.step('refund only has nothing left to refund: the record already holds it');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-refund-only]').should('be.disabled');

            cy.step('mark returned: the moderator confirms the cash went back, no provider called');
            cy.get('[data-test^=button-mark-returned-]').should('have.length', 1).click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test^=button-mark-returned-]').should('not.exist');
            cy.get('[data-test=order-edit-actions-error]').should('not.exist');
            paymentOfOrder<PaymentLike>('moderator', orderId).should((payment) => {
                expect(payment?.displayStatus).to.equal('refunded');
                expect(payment?.refunds[0]?.settledByHand).to.equal(true);
                expect(payment?.actions.settleByHand).to.have.length(0);
            });
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
