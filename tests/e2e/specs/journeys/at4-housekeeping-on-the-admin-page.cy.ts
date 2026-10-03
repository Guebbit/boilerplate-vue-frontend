// requires-module: account, observability
/**
 * @module
 * AT4 · Housekeeping on the admin page. The administrator of a shop who is also the
 * installation's operator (the seeded `root` holds both memberships) refreshes the overview,
 * clears expired tokens behind a confirmation that can be cancelled, reads the platform audit
 * trail (incidents only) through its filters, and opens, reads and closes the realtime stream.
 *
 * Needs the operator's platform key for all of it, plus `tokens.any.delete` for the clear button,
 * which a platform-only operator lacks (that refusal is the roles lane's, not this story's).
 */
import { refuseALogin } from '../../../support/e2e/steps';

/** The slice of `GET /observability/health` this story reads: each worker queue's parked depth. */
interface HealthLike {
    data: { queues?: { name: string; parked: number }[] };
}

describe('AT4 · Housekeeping on the admin page', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refreshes, clears tokens, filters the platform audit trail and drives the stream', () => {
        // The operator's trail lists incidents only: the story makes one for the tab to show.
        refuseALogin();
        cy.loginAs('admin');

        cy.step('the overview refresh asks the API again and answers');
        cy.intercept('GET', '**/observability/health').as('health');
        cy.intercept('GET', '**/observability/metrics/overview').as('overview');
        cy.visit('/en/admin');
        cy.wait('@health');
        cy.get('[data-test=admin-overview-refresh]').should('not.be.disabled').click();
        cy.wait('@health').then(({ response }) => {
            expect(response?.statusCode).to.equal(200);
            cy.wrap((response?.body as HealthLike).data.queues ?? []).as('queues');
        });
        cy.wait('@overview').its('response.statusCode').should('equal', 200);

        cy.step('a row per worker queue the broker answered for, and none where it is off');
        // The queues exist only when the broker is enabled (`NODE_RABBITMQ_ENABLED`), which the demo
        // backend and the live recipe both leave off; the page must agree with whatever was sent.
        cy.get<{ name: string }[]>('@queues').then((queues) => {
            cy.get('[data-test=parked-queue-row]').should('have.length', queues.length);
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
        // Retried as one assertion: the list is refetched on the press, and a read at once can be
        // the page from before it.
        cy.get('[data-test=list-row]').should(($rows) => {
            expect($rows.length).to.be.greaterThan(0);
            for (const row of $rows.toArray()) expect(row.textContent).to.contain('auth.login');
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
