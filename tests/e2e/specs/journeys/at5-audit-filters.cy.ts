// requires-module: account, observability, orders, users
/**
 * @module
 * AT5 · Audit page filters. One known action is written (an admin cancels an order), then each
 * filter on the shop's audit page is held to it: action and actor narrow to rows that carry them,
 * outcome splits success from failure, a `since` in the future empties the page, and reset brings
 * the trail back. Every assertion reads the row's own cells, since the page has no other handle.
 */

/** The slice of a user this story reads. */
interface UserLike {
    id: string;
}

/** Presses search and waits for the trail to answer. */
const search = (): void => {
    cy.get('[data-test=search-submit]').click();
    cy.settleNetwork();
};

describe('AT5 · Audit page filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('action, actor, outcome and since each narrow the trail, and reset restores it', () => {
        cy.subjectId('order.awaitingTransfer').then((orderId) => {
            cy.apiAs('admin', 'POST', `/orders/${orderId}/cancel`);
        });
        // A refused login is a `failure` row; the wrong password is the story's own.
        cy.accountOf('user').then(({ email }) => {
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.request({
                    method: 'POST',
                    url: `${String(apiUrl)}/account/login`,
                    body: { email, password: 'Definitely_Wrong1!' },
                    failOnStatusCode: false
                });
            });
        });

        cy.loginAs('admin');
        cy.accountOf('admin').then(({ email }) => {
            cy.apiAs<{ items: UserLike[] }>('admin', 'POST', '/users/search', { email }).then(
                (found) => {
                    const adminId = String(found?.items[0]?.id);
                    cy.trackNetwork();
                    cy.visit('/en/audit');
                    cy.settleNetwork();
                    cy.get('[data-test=list-row]').its('length').as('all');

                    cy.step('action: every row is that action');
                    cy.get('[data-test=filter-action] input').type('order.cancelled');
                    search();
                    cy.get('[data-test=list-row]').should('have.length.greaterThan', 0);
                    cy.get('[data-test=list-row]').each(($row) => {
                        expect($row.text()).to.contain('order.cancelled');
                    });
                    cy.get('[data-test=search-reset]').click();
                    cy.settleNetwork();

                    cy.step("actor: every row carries the admin's id");
                    cy.get('[data-test=filter-actor] input').type(adminId);
                    search();
                    cy.get('[data-test=list-row]').should('have.length.greaterThan', 0);
                    cy.get('[data-test=list-row]').each(($row) => {
                        expect($row.text()).to.contain(adminId);
                    });
                    cy.get('[data-test=search-reset]').click();
                    cy.settleNetwork();

                    cy.step('outcome: failure rows and success rows never mix');
                    cy.pickOption('[data-test=filter-outcome]', 'Failure');
                    search();
                    cy.get('[data-test=list-row]').should('have.length.greaterThan', 0);
                    cy.get('[data-test=list-row]').each(($row) => {
                        expect($row.text()).to.contain('failure');
                    });
                    cy.pickOption('[data-test=filter-outcome]', 'Success');
                    search();
                    cy.get('[data-test=list-row]').each(($row) => {
                        expect($row.text()).to.not.contain('failure');
                    });
                    cy.get('[data-test=search-reset]').click();
                    cy.settleNetwork();

                    cy.step('since: a date in the future leaves nothing');
                    cy.get('[data-test=filter-since] input').type('2099-01-01T00:00');
                    search();
                    cy.get('[data-test=list-row]').should('not.exist');

                    cy.step('reset: the trail is back');
                    cy.get('[data-test=search-reset]').click();
                    cy.settleNetwork();
                    cy.get('[data-test=list-row]').should('have.length.greaterThan', 0);
                }
            );
        });
    });
});
