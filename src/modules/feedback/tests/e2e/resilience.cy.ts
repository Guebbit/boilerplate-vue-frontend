/**
 * Feedback's own share of the shell's resilience sweep (`tests/e2e/specs/resilience.cy.ts`): the
 * public contact form and the staff inbox render, log nothing unexpected and fit the viewport. It
 * names no value, for the reason the central file gives.
 */
import { assertRouteIsHealthy } from '../../../../../tests/support/e2e/resilience';

describe('the contact form and the inbox render whatever the inbox holds', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('serves the contact form to a visitor quietly and inside the viewport', () => {
        assertRouteIsHealthy('/en/contact', '#contact-page');
    });

    it('serves the staff inbox quietly and inside the viewport', () => {
        cy.loginAs('admin');
        assertRouteIsHealthy('/en/feedback', '#feedback-inbox-page');
    });
});
