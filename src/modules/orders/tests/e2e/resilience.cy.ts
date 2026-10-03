/**
 * The orders' own share of the shell's resilience sweep (`tests/e2e/specs/resilience.cy.ts`): the
 * list and one order's page render, log nothing unexpected and fit the viewport — for the customer
 * who owns the orders, and for the admin who reads the whole ledger. It names no value, for the
 * reason the central file gives.
 */
import { assertRouteIsHealthy } from '../../../../../tests/support/e2e/resilience';

describe('the orders render whatever the ledger holds', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it("serves a customer's list and an order quietly and inside the viewport", () => {
        cy.loginAs('user');
        assertRouteIsHealthy('/en/orders', '#orders-list-page');
        cy.subjectId('order.paid').then((id) => {
            assertRouteIsHealthy(`/en/orders/${id}`, '#order-target');
        });
    });

    it("serves the admin's ledger and an order's edit page quietly and inside the viewport", () => {
        cy.loginAs('admin');
        assertRouteIsHealthy('/en/orders', '#orders-list-page');
        cy.subjectId('order.otherPending').then((id) => {
            assertRouteIsHealthy(`/en/orders/${id}/edit`, '#order-edit-page');
        });
    });
});
