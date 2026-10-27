// requires-module: account, orders, payments
/**
 * @module
 * OP41 · A buyer disputes the payment. The buyer's bank takes a card payment back and the provider
 * says so by a signed webhook: the moderator finds the dispute in Needs attention with its evidence
 * deadline, the drawer shows the chargeback and offers no refund, and the staff timeline (never the
 * buyer's) keeps a "dispute opened" row. Once the bank decides for the shop the banner says so,
 * the refund button is back, the attention row is gone and the timeline closes the dispute.
 *
 * Both profiles: the dispute is a provider delivery, signed with the backend's webhook secret
 * (`E2E_PAYMENT_WEBHOOK_SECRET` live), not a lever.
 */
import { postPaymentWebhook } from '../../../support/e2e/harness';
import type { PaymentWebhookDispute } from '../../../support/e2e/harness';

/** One timeline row, as far as this story reads it. */
interface TimelineRowLike {
    type: string;
}

/** The slice of an order's payment the story reads, as staff are sent it. */
interface PaymentLike {
    providerRef?: string;
    amount: number;
    currency: string;
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

/**
 * What the provider reports about one dispute, `minutes` after the story began.
 *
 * @param payment - the disputed payment, for its money
 * @param startedAt - when the story began, epoch ms
 * @param minutes - how long after the start this report is
 * @param status - where the dispute stands in this report
 */
const report = (
    payment: PaymentLike,
    startedAt: number,
    minutes: number,
    status: PaymentWebhookDispute['status']
): PaymentWebhookDispute => ({
    disputeRef: 'dp_op41',
    kind: 'chargeback',
    status,
    reason: 'product_not_received',
    amount: payment.amount,
    currency: payment.currency,
    fundsWithdrawn: status !== 'won',
    evidenceDueBy: new Date(startedAt + 7 * 86_400_000).toISOString(),
    observedAt: new Date(startedAt + minutes * 60_000).toISOString(),
    dashboardUrl: 'https://dashboard.fake-psp.example/disputes/dp_op41'
});

describe('OP41 · A buyer disputes the payment', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the chargeback with its deadline, pauses refunds, and returns them once the shop wins', () => {
        const startedAt = Date.now();
        cy.subjectId('order.paid').then((orderId) => {
            cy.apiAs<{ items: PaymentLike[] }>(
                'moderator',
                'GET',
                `/orders/${orderId}/payments`
            ).then((answer) => {
                const payment = answer?.items[0];
                if (!payment?.providerRef) throw new Error('the order has no card payment');
                const { providerRef } = payment;

                cy.step('the bank takes the money back and the provider says so');
                postPaymentWebhook({
                    id: 'evt_op41_opened',
                    providerRef,
                    dispute: report(payment, startedAt, 0, 'needs_response')
                }).should('equal', 204);

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
                postPaymentWebhook({
                    id: 'evt_op41_won',
                    providerRef,
                    dispute: report(payment, startedAt, 60, 'won')
                }).should('equal', 204);
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
});
