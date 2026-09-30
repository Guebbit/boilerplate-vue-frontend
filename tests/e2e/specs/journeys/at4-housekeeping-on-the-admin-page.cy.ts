// requires-module: account, observability
/**
 * @module
 * AT4 · Housekeeping on the admin page. The administrator of a shop who is also the
 * installation's operator (the seeded `root` holds both memberships) refreshes the overview,
 * clears expired tokens behind a confirmation that can be cancelled, reads the platform audit
 * trail through its filters, and opens, reads and closes the realtime stream.
 *
 * Needs the operator's platform key for all of it, plus `tokens.any.delete` for the clear button,
 * which a platform-only operator lacks (that refusal is the roles lane's, not this story's).
 */

/**
 * Whether this run is against the live stack, where the broker exists and so queues are listed.
 *
 * @returns a chain yielding true on the live profile
 */
const isLive = (): Cypress.Chainable<boolean> =>
    cy.env(['liveProfile']).then(({ liveProfile }) => liveProfile === true);

describe('AT4 · Housekeeping on the admin page', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refreshes, clears tokens, filters the platform audit trail and drives the stream', () => {
        cy.loginAs('admin');

        cy.step('the overview refresh asks the API again and answers');
        cy.intercept('GET', '**/observability/health').as('health');
        cy.intercept('GET', '**/observability/metrics/overview').as('overview');
        cy.visit('/en/admin');
        cy.wait('@health');
        cy.get('[data-test=admin-overview-refresh]').should('not.be.disabled').click();
        cy.wait('@health').its('response.statusCode').should('equal', 200);
        cy.wait('@overview').its('response.statusCode').should('equal', 200);

        cy.step('worker queues are listed only where a broker exists');
        isLive().then((live) => {
            cy.get('[data-test=parked-queue-row]').should(live ? 'exist' : 'not.exist');
        });

        cy.step('cancelling the token clean-up sends nothing; confirming sends it');
        cy.intercept('DELETE', '**/account/tokens/expired').as('clearTokens');
        cy.get('[data-test=admin-clear-expired-tokens]').click();
        cy.get('[data-test=app-dialog-cancel]').click();
        cy.get('@clearTokens.all').should('have.length', 0);
        cy.get('[data-test=admin-clear-expired-tokens]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.wait('@clearTokens').its('response.statusCode').should('be.within', 200, 299);

        cy.step('the platform audit tab filters by action, then resets');
        cy.get('[data-test=admin-tab-audit]').click();
        cy.get('[data-test=list-row]').should('have.length.gte', 1);
        cy.get('[data-test=filter-action] input').type('auth.login');
        cy.get('[data-test=search-submit]').click();
        cy.get('[data-test=list-row]').should('have.length.gte', 1);
        cy.get('[data-test=list-row]').each(($row) => {
            expect($row.text()).to.contain('auth.login');
        });
        cy.get('[data-test=filter-action] input').clear();
        cy.get('[data-test=filter-action] input').type('no.such.action');
        cy.get('[data-test=search-submit]').click();
        cy.get('[data-test=list-row]').should('not.exist');
        cy.get('[data-test=search-reset]').click();
        cy.get('[data-test=list-row]').should('have.length.gte', 1);

        cy.step('the realtime stream connects, shows raw events, and disconnects');
        cy.visit('/en/playground/realtime');
        cy.get('[data-test=realtime-connect]').click();
        cy.get('[data-test=realtime-status]').should('contain.text', 'open');
        cy.get('[data-test=realtime-feed-summary]').should('contain.text', 'snapshot');
        cy.get('[role=log] pre').should('not.exist');
        cy.get('[data-test=realtime-raw-events] input').check({ force: true });
        cy.get('[role=log] pre').should('contain.text', 'uptimeSeconds');
        cy.get('[data-test=realtime-disconnect]').click();
        cy.get('[data-test=realtime-status]').should('contain.text', 'closed');
    });
});
