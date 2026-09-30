// requires-module: feedback
/**
 * @module
 * AT5 · Feedback inbox filters. The `shop` seed holds no tickets, so three are written here: two
 * ordinary from different addresses, and one the honeypot turns into spam. Text, email and status
 * each narrow the inbox to the tickets that match; reset brings all three back.
 */

/** The slice of a ticket the write answers with. */
interface TicketLike {
    id: string;
}

/**
 * Writes one ticket through the public contact door.
 *
 * @param email - the sender
 * @param subject - the subject line, also what the text filter looks for
 * @param extra - further body fields, e.g. the honeypot
 */
const contact = (email: string, subject: string, extra: Record<string, unknown> = {}) =>
    cy.apiAs<TicketLike>('admin', 'POST', '/feedback/contact', {
        email,
        subject,
        message: `Body of ${subject}`,
        ...extra
    });

/** Presses search and waits for the inbox to answer. */
const search = (): void => {
    cy.get('[data-test=search-submit]').click();
    cy.settleNetwork();
};

describe('AT5 · Feedback inbox filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('text, email and status each narrow the inbox, and reset brings every ticket back', () => {
        contact('ann@example.com', 'Kennel question');
        contact('bob@example.com', 'Invoice question').then((ticket) => {
            cy.apiAs('admin', 'PATCH', `/feedback/${String(ticket?.id)}`, { status: 'resolved' });
        });
        contact('bot@example.com', 'Buy now', { website: 'https://spam.example' });

        cy.loginAs('admin');
        cy.trackNetwork();
        cy.visit('/en/feedback');
        cy.settleNetwork();
        cy.get('[data-test=feedback-item]').should('have.length', 3);

        cy.step('text: only the ticket whose subject holds it');
        cy.get('[data-test=filter-text] input').type('Kennel');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', 'Kennel question');
        cy.get('[data-test=search-reset]').click();
        cy.settleNetwork();
        cy.get('[data-test=feedback-item]').should('have.length', 3);

        cy.step('email: only that sender');
        cy.get('[data-test=filter-email] input').type('bob@example.com');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', 'Invoice question');
        cy.get('[data-test=search-reset]').click();
        cy.settleNetwork();

        cy.step('status: resolved, spam and new each show only their own');
        cy.pickOption('[data-test=filter-status]', 'Resolved');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', 'Invoice question');
        cy.get('[data-test=feedback-responded-at]').should('exist');
        cy.pickOption('[data-test=filter-status]', 'Spam');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', 'Buy now');
        cy.pickOption('[data-test=filter-status]', 'New');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', 'Kennel question');

        cy.step('reset: all three again');
        cy.get('[data-test=search-reset]').click();
        cy.settleNetwork();
        cy.get('[data-test=feedback-item]').should('have.length', 3);
    });
});
