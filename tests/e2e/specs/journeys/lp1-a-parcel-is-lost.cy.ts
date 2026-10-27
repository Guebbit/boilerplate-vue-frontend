// requires-module: account, delivery, orders
/**
 * @module
 * LP1 · A parcel is lost. The warehouse reports the customer's shipped parcel lost, with a note for
 * colleagues and a message for the buyer. The shipment reads "Lost in transit", its units are open
 * again on the same order (the order is being prepared once more and the ship button is back), and
 * shipping them again puts the order back to shipped. The buyer sees the message, never the note.
 */

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

const MESSAGE = 'A new one ships on Monday.';
const NOTE = 'carrier claim opened, ref 4471';

describe('LP1 · A parcel is lost', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('reopens the units on the same order, ships again, and tells the buyer without the note', () => {
        cy.subjectId('order.shipped').then((orderId) => {
            cy.step('the warehouse reports the parcel lost, with a note and a message');
            cy.loginAs('warehouse');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=open-report-lost]').first().click();
            cy.get('[data-test=report-lost-submit]').should('be.disabled');
            cy.get('[data-test=report-lost-reason]').click();
            cy.get('[role=listbox] [role=option]').contains('Lost by the carrier').click();
            cy.get('[data-test=report-lost-note] textarea').type(NOTE);
            cy.get('[data-test=report-lost-message] textarea').type(MESSAGE);
            cy.get('[data-test=report-lost-submit]').should('not.be.disabled').click();
            cy.get('[data-test=report-lost-dialog]').should('not.exist');

            cy.step('the shipment reads lost; the units are open and the order is being prepared');
            cy.get('[data-test=shipment-status]').first().should('contain.text', 'Lost in transit');
            cy.get('[data-test=shipment-lost-message]').should('contain.text', MESSAGE);
            cy.get('[data-test=shipment-lost-note]').should('contain.text', NOTE);
            cy.get('[data-test=open-ship]').should('exist');
            cy.apiAs<OrderLike>('warehouse', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'processing');

            cy.step('the buyer reads the message and never the note');
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=shipment-lost-message]').should('contain.text', MESSAGE);
            cy.get('[data-test=shipment-lost-note]').should('not.exist');
            cy.get('[data-test=open-report-lost]').should('not.exist');

            cy.step('the warehouse ships the same units again and the order is shipped once more');
            cy.switchUser('warehouse');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=open-ship]').first().click();
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
            cy.apiAs<OrderLike>('warehouse', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'shipped');
        });
    });

    it('settles the order as cancelled, not delivered, when the buyer takes the refund', () => {
        cy.subjectId('order.shipped').then((orderId) => {
            cy.step('the warehouse reports the only parcel lost');
            cy.loginAs('warehouse');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=open-report-lost]').first().click();
            cy.get('[data-test=report-lost-reason]').click();
            cy.get('[role=listbox] [role=option]').contains('Lost by the carrier').click();
            cy.get('[data-test=report-lost-submit]').should('not.be.disabled').click();
            cy.get('[data-test=report-lost-dialog]').should('not.exist');

            cy.step('the buyer cancels what the parcel carried and is refunded');
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=cancel-remainder-open]').click();
            cy.get('[data-test=cancel-remainder-confirm]').click();
            cy.get('[data-test=cancel-remainder-dialog]').should('not.exist');

            cy.step(
                'nothing ever arrived: the order is cancelled, with no clock and no delivered row'
            );
            cy.apiAs<OrderLike & { withdrawUntil?: string }>(
                'user',
                'GET',
                `/orders/${orderId}`
            ).should((order) => {
                expect(order?.status).to.equal('cancelled');
                expect(order?.withdrawUntil).to.equal(undefined);
            });
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-timeline-entry][data-type=cancelled]').should(
                'contain.text',
                'Lost in transit, refunded'
            );
            cy.get('[data-test=order-timeline-entry][data-type=delivered]').should('not.exist');
        });
    });
});
