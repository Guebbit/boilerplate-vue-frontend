/**
 * Inventory's own share of the shell's resilience sweep (`tests/e2e/specs/resilience.cy.ts`): the
 * stock board and the preorder board render, log nothing unexpected and fit the viewport for the
 * staff who read them. It names no value, for the reason the central file gives.
 */
import { assertRouteIsHealthy } from '../../../../../tests/support/e2e/resilience';

describe('the stock boards render whatever the ledger holds', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('serves the stock board and the preorder board quietly and inside the viewport', () => {
        cy.loginAs('admin');
        assertRouteIsHealthy('/en/inventory', '#inventory-page');
        assertRouteIsHealthy('/en/sales/preorders', '#preorders-board-page');
    });
});
