// requires-module: account, orders, payments
/**
 * @module
 * OP26 · A goodwill refund, in part. The admin gives a customer part of the money back from the
 * order's edit page. The amount field refuses what is not money, the server refuses what is more
 * than is left, a double press lands one refund, and the customer sees a partial refund, a credit
 * note and a mail. Taking back the rest then closes the payment, and nothing more can be refunded.
 *
 * The story is about the amount an operator types: it is the one place a refund is not "all of it".
 * The payments drawer and the refunds tab are OP36's. The order is the seeded `order.paid`, so no
 * card budget is spent.
 */
import { eventually, orderMailTo } from '../../../support/e2e/steps';

/** The goodwill amount, in the payment's currency. */
const GOODWILL = 5;

/** The slice of a payment this story reads. */
interface PaymentLike {
    amount: number;
    amountRefunded: number;
    displayStatus: string;
    refunds: { amount: number }[];
}

describe('OP26 · A goodwill refund, in part', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refuses what is not money, refunds the part once, and the rest closes the payment', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`).then((before) => {
                const total = Number(before?.amount);
                expect(before?.amountRefunded, 'nothing has gone back yet').to.equal(0);

                cy.step('the admin types zero, then a negative amount: the field says no');
                cy.loginAs('admin');
                cy.visit(`/en/orders/${orderId}/edit`);
                for (const typed of ['0', '-3']) {
                    cy.get('[data-test=refund-amount] input').clear();
                    cy.get('[data-test=refund-amount] input').type(typed);
                    cy.get('[data-test=refund-amount]').should(
                        'contain.text',
                        'Enter a positive amount'
                    );
                    cy.get('[data-test=button-refund-only]').should('be.disabled');
                }

                cy.step('a fraction of a cent is refused by the server, and nothing moves');
                cy.get('[data-test=refund-amount] input').clear();
                cy.get('[data-test=refund-amount] input').type('0.001');
                cy.get('[data-test=button-refund-only]').click();
                cy.get('[data-test=order-edit-actions-error]').should(
                    'contain.text',
                    "That is not a valid amount in the payment's currency."
                );

                cy.step('more than is left is refused too');
                cy.get('[data-test=refund-amount] input').clear();
                cy.get('[data-test=refund-amount] input').type(String(total + 1));
                cy.get('[data-test=button-refund-only]').click();
                cy.get('[data-test=order-edit-actions-error]').should(
                    'contain.text',
                    'That is more than is left to refund on this payment.'
                );
                cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`).should(
                    (payment) => {
                        expect(payment?.amountRefunded, 'neither refusal moved money').to.equal(0);
                    }
                );

                cy.step('a double press on a real amount lands exactly one refund');
                cy.get('[data-test=refund-amount] input').clear();
                cy.get('[data-test=refund-amount] input').type(GOODWILL.toFixed(2));
                cy.get('[data-test=button-refund-only]').dblclick();
                cy.contains('Payment refunded. The order status is unchanged.').should('exist');
                eventually(
                    () => cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`),
                    (payment) => (payment?.refunds.length ?? 0) > 0
                ).should((payment) => {
                    expect(payment?.refunds).to.have.length(1);
                    expect(payment?.refunds[0]?.amount).to.equal(GOODWILL);
                    expect(payment?.displayStatus).to.equal('partially_refunded');
                });
                cy.apiAs<{ status: string }>('admin', 'GET', `/orders/${orderId}`).should((order) =>
                    expect(order?.status, 'the order did not move').to.equal('paid')
                );

                cy.step('the customer is mailed, and holds a credit note for it');
                orderMailTo('user', orderId, 'Your refund has been issued');
                eventually(
                    () => cy.apiAs<unknown[]>('user', 'GET', `/orders/${orderId}/credit-notes`),
                    (notes) => (notes?.length ?? 0) > 0
                ).should((notes) => expect(notes).to.have.length(1));

                cy.step('the rest goes back in one more press, and then nothing can be refunded');
                cy.get('[data-test=refund-amount] input').clear();
                cy.get('[data-test=button-refund-only]').should('not.be.disabled').click();
                eventually(
                    () => cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`),
                    (payment) => payment?.displayStatus === 'refunded'
                ).should((payment) => {
                    expect(payment?.refunds).to.have.length(2);
                    expect(payment?.amountRefunded).to.equal(total);
                });
                cy.get('[data-test=button-refund-only]').should('be.disabled');

                cy.step('the customer sees a refunded payment and a credit note for each refund');
                cy.switchUser('user');
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=payment-status]').should('contain.text', 'Refunded');
                cy.get('[data-test=order-credit-note-row]').should('have.length', 2);
            });
        });
    });
});
