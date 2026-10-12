// requires-module: account, delivery, orders
/**
 * @module
 * OP24 · Ship an order in two goes. The seeded order has three units and one has already left, so
 * the shop sees one group "Partly shipped" with one shipment. The admin ships what remains in a
 * second shipment, then marks each shipment delivered on its own: the order is `shipped` only once
 * the last unit has left, `delivered` only once the last shipment has arrived, and only then does
 * the customer's withdrawal deadline appear.
 *
 * Every button comes from the record's own actions, so the story reads the order's state off the
 * API between steps — the screen follows the server, it never counts the parcels itself.
 */
import { shipTheOpenGroup } from '../../../support/e2e/steps';

/** The tracking code the admin types for the second shipment. */
const TRACKING_CODE = 'TRK-E2E-OP24';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
    fulfillmentStatus: string;
    actions?: { withdrawUntil?: string };
}

/**
 * Asserts the order's two status words, read as the customer.
 *
 * @param orderId - the order
 * @param status - the order status expected
 * @param fulfillmentStatus - the fulfilment status expected
 */
const customerSees = (orderId: string, status: string, fulfillmentStatus: string): void => {
    cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
        expect(order?.status).to.equal(status);
        expect(order?.fulfillmentStatus).to.equal(fulfillmentStatus);
    });
};

describe('OP24 · Ship an order in two goes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('ships the rest in a second shipment, delivers both, and the deadline starts at the last', () => {
        cy.subjectId('order.partiallyFulfilled').then((orderId) => {
            cy.step('the admin finds one group, partly shipped, with one shipment on it');
            cy.loginAs('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=fulfillment-order-card]').should('have.length', 1);
            cy.get('[data-test=fulfillment-order-status]').should('contain.text', 'Partly shipped');
            cy.get('[data-test=shipment-row]').should('have.length', 1);
            customerSees(orderId, 'processing', 'partially_fulfilled');

            cy.step('ships what is left: a second shipment, and now nothing remains to ship');
            shipTheOpenGroup(TRACKING_CODE);
            cy.get('[data-test=shipment-row]').should('have.length', 2);
            cy.get('[data-test=open-ship]').should('not.exist');
            cy.get('[data-test=fulfillment-order-status]').should('contain.text', 'Fulfilled');
            customerSees(orderId, 'shipped', 'shipped');

            cy.step('delivers the first shipment: the order has not arrived yet');
            cy.get('[data-test=mark-delivered]').should('have.length', 2);
            cy.get('[data-test=mark-delivered]').first().click();
            cy.get('[data-test=mark-delivered]').should('have.length', 1);
            customerSees(orderId, 'shipped', 'shipped');

            cy.step('delivers the second: the order is delivered and the clock starts');
            cy.get('[data-test=mark-delivered]').click();
            cy.get('[data-test=mark-delivered]').should('not.exist');
            customerSees(orderId, 'delivered', 'fulfilled');
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(
                    order?.actions?.withdrawUntil,
                    'a deadline once the last shipment arrived'
                ).to.be.a('string');
            });

            cy.step('the customer sees two shipments and the tracking code, and nothing to press');
            cy.logout();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=shipment-count]').should('contain.text', '2');
            cy.get('[data-test=shipment-row]').should('have.length', 2);
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.get('[data-test=open-ship]').should('not.exist');
        });
    });
});
