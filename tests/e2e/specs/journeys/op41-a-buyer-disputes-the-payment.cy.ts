// requires-module: account, orders, payments
/**
 * @module
 * OP41 · A buyer disputes the payment. The buyer's bank takes a card payment back: the moderator
 * finds it in Needs attention with its evidence deadline, the drawer shows the chargeback and
 * offers no refund, and the staff timeline (never the buyer's) keeps a "dispute opened" row. Once
 * the bank decides for the shop the banner says so, the refund button is back, the attention row
 * is gone and the timeline closes the dispute.
 *
 * Demo only: the dispute is a lever on the fake payment provider.
 */
import { disputePaymentOf } from '../../../support/e2e/harness';

/** One timeline row, as far as this story reads it. */
interface TimelineRowLike {
    type: string;
}

/**
 * The kinds of row an order's timeline holds, as one caller reads it.
 *
 * @param role - whose view
 * @param orderId - the order
 */
const timelineTypes = (role: 'moderator' | 'user', orderId: string): Cypress.Chainable<string[]> =>
    cy
        .apiAs<TimelineRowLike[]>(role, 'GET', `/orders/${orderId}/timeline`)
        .then((rows) => (rows ?? []).map((row) => row.type));

describe('OP41 · A buyer disputes the payment', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the chargeback with its deadline, pauses refunds, and returns them once the shop wins', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.step('the bank takes the money back');
            disputePaymentOf(orderId);

            cy.step('Needs attention lists the dispute with the days left to answer');
            cy.loginAs('moderator');
            cy.visit('/en/sales/payments?tab=attention');
            cy.contains('[data-test=attention-row]', orderId).within(() => {
                cy.get('[data-test=attention-kind]').should(
                    'contain.text',
                    "Dispute to answer in the provider's dashboard"
                );
                cy.get('[data-test=attention-deadline]').should(
                    'contain.text',
                    'left to send evidence'
                );
                cy.get('[data-test=attention-open-payment]').click();
            });

            cy.step('the drawer shows the chargeback and offers no refund');
            cy.get('[data-test=dispute-banner]').should('contain.text', 'Chargeback');
            cy.get('[data-test=dispute-refunds-paused]').should('exist');
            cy.get('[data-test=drawer-refund]').should('not.exist');
            cy.get('[data-test=drawer-close]').click();

            cy.step('the staff timeline keeps the row; the buyer’s does not');
            timelineTypes('moderator', orderId).should('include', 'dispute_opened');
            timelineTypes('user', orderId).should('not.include', 'dispute_opened');

            cy.step('the bank decides for the shop: the banner says so and the refund is back');
            disputePaymentOf(orderId, { status: 'won' });
            cy.get('[data-test=attention-reload]').click();
            cy.contains('[data-test=attention-row]', orderId).should('not.exist');
            cy.visit('/en/sales/payments');
            cy.get('[data-test=filter-order-id] input').type(orderId);
            cy.get('[data-test=payments-search-submit]').click();
            cy.get('[data-test=payment-row]').should('have.length', 1).first().click();
            cy.get('[data-test=dispute-status]').should('contain.text', 'Decided in the shop');
            cy.get('[data-test=dispute-refunds-paused]').should('not.exist');
            cy.get('[data-test=drawer-refund]').should('exist');
            timelineTypes('moderator', orderId).should('include', 'dispute_closed');
        });
    });
});
