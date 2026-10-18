// requires-module: account, orders, payments
/**
 * @module
 * OP31 · A refund the provider refuses. The moderator refunds a paid order from the payments
 * drawer while the card network says no: the drawer shows the refusal, the Refunds tab lists the
 * failed record with its reason, and the staff timeline (never the buyer's) keeps a "refund
 * failed" row. An hour later the Needs-attention tab lists the open refund; once the provider
 * lets it through, the retry sweep completes it, the attention list empties, the payment reads
 * Refunded and the buyer is mailed.
 *
 * Demo only: the refusal is a lever on the fake payment provider, and the hour is a clock jump.
 */
import { failRefundsOf } from '../../../support/e2e/harness';
import { byTemplate } from '../../../../scripts/e2e/mail-filters';

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

describe('OP31 · A refund the provider refuses', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('fails visibly, waits in Needs attention, and completes once the provider lets it through', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.step('the card network refuses; the moderator tries the refund from the drawer');
            failRefundsOf(orderId, 'insufficient_funds');
            cy.loginAs('moderator');
            cy.visit('/en/sales/payments');
            cy.get('[data-test=filter-order-id] input').type(orderId);
            cy.get('[data-test=payments-search-submit]').click();
            cy.get('[data-test=payment-row]').should('have.length', 1).first().click();
            cy.get('[data-test=drawer-refund]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=drawer-refund-error]').should('not.be.empty');
            cy.get('[data-test=drawer-close]').click();

            cy.step('the Refunds tab lists the failed refund with its reason');
            cy.get('[data-test=payments-tab-refunds]').click();
            cy.pickOption('[data-test=refund-filter-status]', 'Failed');
            cy.get('[data-test=refund-filter-order-id] input').type(orderId);
            cy.get('[data-test=refunds-search-submit]').click();
            cy.get('[data-test=refund-failure-reason]').should('have.length', 1);

            cy.step('the staff timeline says it failed; the buyer’s does not');
            timelineTypes('moderator', orderId).should('include', 'refund_failed');
            timelineTypes('user', orderId).should('not.include', 'refund_failed');

            cy.step('an hour later the open refund is in Needs attention');
            cy.travel(61 * 60_000);
            cy.loginAs('moderator');
            cy.visit('/en/sales/payments?tab=attention');
            cy.contains('[data-test=attention-row]', orderId).within(() => {
                cy.get('[data-test=attention-kind]').should(
                    'contain.text',
                    'Refund open for too long'
                );
                cy.get('[data-test=attention-failure-reason]').should('exist');
            });

            cy.step('the provider lets it through and the sweep completes the refund');
            failRefundsOf(orderId, null);
            cy.runJob('sweep-payment-effects');
            cy.get('[data-test=attention-reload]').click();
            cy.contains('[data-test=attention-row]', orderId).should('not.exist');
            cy.visit('/en/sales/payments');
            cy.get('[data-test=filter-order-id] input').type(orderId);
            cy.get('[data-test=payments-search-submit]').click();
            cy.get('[data-test=payment-row] [data-test=payment-status]').should(
                'contain.text',
                'Refunded'
            );
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(email, byTemplate('payments.refund-issued'));
            });
        });
    });
});
