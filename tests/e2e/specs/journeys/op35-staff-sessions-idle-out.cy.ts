// requires-module: account, inventory
/**
 * @module
 * OP35 · A staff session idles out, a shopper's never does. A warehouse worker who sits unused
 * past the limit the server publishes is sent to sign in again with a notice; a shopper across
 * the same stretch of time is still signed in.
 *
 * Time passes by moving the demo backend's clock, so this is a demo-only journey. The "Still
 * there?" prompt is not walked: the page's own background reads count as activity on a clock the
 * browser moves, so it never reaches the last two minutes in a run. The limit is read from the
 * server, never hard-coded.
 */
import { loginDevice, refreshDevice, requestAsDevice } from '../../../support/e2e/harness';

/** Slack past the limit, so the jump lands clearly beyond it. */
const PAST_LIMIT_MS = 60_000;

/** The slice of the touch answer this story reads. */
interface TouchAnswer {
    data?: { idleTimeoutSeconds?: number };
}

/**
 * The staff idle limit the server publishes, read as the page does: by touching a session.
 *
 * @returns a chain yielding the limit in milliseconds
 */
const idleLimitMs = (): Cypress.Chainable<number> =>
    loginDevice('warehouse').then((device) =>
        requestAsDevice(device, 'POST', '/account/session/touch').then((response) => {
            const seconds = (response.body as TouchAnswer | null)?.data?.idleTimeoutSeconds;
            expect(seconds, 'a staff session publishes its idle limit').to.be.a('number');
            return Number(seconds) * 1000;
        })
    );

describe('OP35 · A staff session idles out, a shopper’s never does', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the worker is sent to sign in again past the limit, and a shopper is not', () => {
        cy.skipUnlessDemo();

        cy.step('a warehouse worker is in the stock room; a shopper is signed in on a device');
        cy.loginAs('warehouse');
        cy.visit('/en/inventory');
        cy.get('#inventory-page').should('exist');
        loginDevice('user').then((shopper) => {
            idleLimitMs().then((limitMs) => {
                cy.step('both sit unused past the staff limit');
                cy.travel(limitMs + PAST_LIMIT_MS);

                cy.step('the shopper’s session is untouched');
                refreshDevice(shopper).its('status').should('equal', 200);

                cy.step('the worker’s next page lands on sign-in');
                cy.visit('/en/inventory');
                cy.get('#login-page').should('exist');
            });
        });
    });
});
