// requires-module: account, delivery, inventory, orders, payments
/**
 * @module
 * OP1 · Fulfil a paid order the ordinary way. The admin takes the customer's paid express order
 * from "paid" to "delivered" through the shipment panel and nothing else — no status override —
 * and the customer sees where it stands and is mailed the tracking code.
 *
 * The story is about each button existing only in the state that allows it, so every step names
 * the buttons that must be absent as well as the one that must be present. Express is tracked:
 * the panel keeps "ship" disabled until a code is typed.
 */
import { mailMentions } from '../../../../scripts/e2e/mail-message';
import { seedAccount } from '../../../support/e2e/scenario';

/** The tracking code the admin types. Chosen here, so the mail can be searched for it. */
const TRACKING_CODE = 'TRK-E2E-OP1';

/** The slice of an order this story reads: where it is and where the parcel is. */
interface OrderLike {
    status: string;
    fulfillmentStatus: string;
}

/**
 * Asserts which order state the API reports, read as the customer — the account that has to be
 * told. One read per step, so each step is held to a state rather than to a screen.
 *
 * @param orderId - the order
 * @param status - the order status expected
 */
const customerSees = (orderId: string, status: string): void => {
    cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
        expect(order?.status).to.equal(status);
    });
};

describe('OP1 · Fulfil a paid order the ordinary way', { tags: '@smoke' }, () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('starts, ships with a tracking code and delivers, each button only in its own state', () => {
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.step('the admin opens the paid order: only "start" is offered');
            cy.loginAs('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=shipment-panel]').should('exist');
            cy.get('[data-test=mark-started]').should('exist');
            cy.get('[data-test=mark-shipped]').should('not.exist');
            cy.get('[data-test=mark-delivered]').should('not.exist');
            customerSees(orderId, 'paid');

            cy.step('marks it started: "start" gives way to "ship"');
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=mark-started]').should('not.exist');
            cy.get('[data-test=tracking-code-input]').should('exist');
            cy.get('[data-test=mark-delivered]').should('not.exist');
            customerSees(orderId, 'processing');

            cy.step('express is tracked, so "ship" stays shut without a code');
            cy.get('[data-test=mark-shipped]').should('be.disabled');
            cy.get('[data-test=tracking-code-input] input').type(TRACKING_CODE);
            cy.get('[data-test=mark-shipped]').should('not.be.disabled').click();
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.get('[data-test=mark-shipped]').should('not.exist');
            customerSees(orderId, 'shipped');

            cy.step('the customer is mailed the tracking code');
            cy.emailTo(seedAccount('user').email, (mail) => mailMentions(mail, TRACKING_CODE));

            cy.step('marks it delivered: nothing is left to press');
            cy.get('[data-test=mark-delivered]').click();
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.get('[data-test=mark-started]').should('not.exist');
            cy.get('[data-test=mark-shipped]').should('not.exist');
            customerSees(orderId, 'delivered');

            cy.step('the customer sees the parcel and its code, and has nothing to press');
            cy.logout();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.get('[data-test=shipment-status]').should('exist');
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.get('[data-test=mark-shipped]').should('not.exist');
        });
    });
});
