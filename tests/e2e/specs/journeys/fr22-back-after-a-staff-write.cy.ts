// requires-module: delivery, orders
/**
 * @module
 * FR22 · I pressed Back after a staff write. A warehouse account opens a paid express order from
 * the filtered orders list, starts and ships it, then presses Back. The list shows the order as
 * shipped, never the "paid" it was cached as; Forward shows the shipment and no "ship" button;
 * a reload says the same.
 */
import { listedIds, submitSearch } from '../../../support/e2e/steps';

/** The tracking code the express parcel needs. */
const TRACKING_CODE = 'FR22-TRACK-001';

describe('FR22 · I pressed Back after a staff write', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the list, the order and a reload all agree the order shipped', () => {
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.step('the warehouse finds the order in the staff list and opens it');
            cy.loginAs('warehouse');
            cy.visit('/en/sales/orders');
            cy.get('[data-test=filter-id] input').type(orderId);
            submitSearch();
            listedIds().should('deep.equal', [orderId]);
            cy.get('[data-test=row-fulfillment-status]').should('not.contain.text', 'Shipped');
            cy.get('[data-test=row-view]').click();
            cy.get('[data-test=shipment-panel]').should('exist');

            cy.step('starts and ships it');
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').should('exist').click();
            cy.get('[data-test=ship-tracking-code] input').type(TRACKING_CODE);
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);

            cy.step('Back: the list row reads shipped, not the cached paid');
            cy.go('back');
            cy.location('pathname').should('equal', '/en/sales/orders');
            listedIds().should('deep.equal', [orderId]);
            cy.get('[data-test=row-fulfillment-status]').should('contain.text', 'Shipped');

            cy.step('Forward: the shipment is listed and there is no ship button');
            cy.go('forward');
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.get('[data-test=open-ship]').should('not.exist');

            cy.step('a reload says the same');
            cy.reload();
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.get('[data-test=open-ship]').should('not.exist');
        });
    });
});
