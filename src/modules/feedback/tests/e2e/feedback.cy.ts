/**
 * @module
 * Cypress end-to-end spec driving the real app: submits the public contact form, then reads the
 * resulting ticket back through the admin inbox — the feedback module's whole loop, driven the way
 * a visitor and then an admin would drive it. The inbox starts empty on purpose — the demo profile
 * seeds no tickets — so the form IS the fixture.
 */
describe('Feedback', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    it('a message sent through the form lands in the inbox', () => {
        // One page session throughout: the admin walks from the form to the inbox through the
        // app's own navigation, which is the more honest test of the two pages being wired
        // together — and the only one that proves the ticket survived without a reload.
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input')
            .should('not.be.disabled')
            .type('curious@example.com');
        cy.get('[data-test=contact-subject] input')
            .should('not.be.disabled')
            .type('A question about the cats');
        cy.get('[data-test=contact-message] textarea')
            .first()
            .should('not.be.disabled')
            .type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();
        cy.contains('Message sent').should('exist');

        cy.navigateViaMenu('admin', '/en/feedback');
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.contains('[data-test=feedback-item]', 'A question about the cats').should('exist');
    });

    it('a submission caught by the honeypot lands in the inbox already marked spam', () => {
        // A real visitor never reaches this field — see Contact.vue's own comment on it — so
        // filling it is what a generic bot autofill does, not what a person driving the UI would.
        // `{ force: true }` is what makes Cypress fill an element it would otherwise refuse to
        // touch for being invisible, which is the honeypot's whole point.
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('bot@example.com');
        cy.get('[data-test=contact-subject] input').type('Buy now');
        cy.get('[data-test=contact-message] textarea').first().type('Cheap products, click here.');
        cy.get('[data-test=contact-website]').type('https://spam-bot.example', { force: true });
        cy.get('[data-test=contact-submit]').click();
        // The BE's whole point: the bot sees the same success a real visitor does.
        cy.contains('Message sent').should('exist');

        cy.navigateViaMenu('admin', '/en/feedback');
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-status]').should('contain.text', 'Spam');
    });

    it('an admin can permanently delete a ticket, and it disappears from the inbox', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.get('[data-test=contact-message] textarea')
            .first()
            .type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/feedback');
        cy.get('[data-test=feedback-item]').should('have.length', 1);

        // GET /feedback answers `Cache-Control: private, max-age=30` (see `searchCache` on the
        // BE), so the reload this triggers is a real network round trip only because
        // `fetchRequests` busts the browser cache with a `_` query param — see its own comment.
        // The trailing `*` matches that param as well as the bare path. Waited on explicitly
        // rather than left to `.should()`'s implicit retry, so a regression here fails on THIS
        // line instead of timing out on the assertion below with nothing pointing at the cause.
        cy.intercept('GET', '**/feedback*').as('reload');

        cy.get('[data-test=feedback-delete]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.wait('@reload');

        cy.get('[data-test=feedback-item]').should('have.length', 0);
        cy.contains('Ticket deleted').should('exist');
    });

    it('declining the delete confirmation leaves the ticket in place', () => {
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.get('[data-test=contact-message] textarea')
            .first()
            .type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();

        cy.navigateViaMenu('admin', '/en/feedback');
        cy.get('[data-test=feedback-item]').should('have.length', 1);

        cy.get('[data-test=feedback-delete]').click();
        cy.get('[data-test=app-dialog-cancel]').click();

        cy.get('[data-test=feedback-item]').should('have.length', 1);
    });

    it('rejects an empty form with field errors, not a request', () => {
        cy.visit('/en/contact');
        cy.get('[data-test=contact-submit]').click();
        cy.get('.v-messages__message').should('exist');
    });

    it('the inbox is admin-only: a plain user is sent home with the forbidden notice', () => {
        cy.loginAs('user');
        cy.visit('/en/feedback');

        // Not merely "the inbox is absent" — where they LANDED is the assertion, because a
        // blank error page would also have no inbox and prove nothing.
        cy.get('#home-page').should('exist');
        cy.get('#feedback-inbox-page').should('not.exist');
    });

    it('the inbox asks a guest to log in, keeping the target', () => {
        cy.visit('/en/feedback');

        cy.get('#login-page').should('exist');
        cy.url().should('include', 'continue=');
    });
});

describe('Static pages', () => {
    it('about renders and cross-links reach the other three', () => {
        cy.visit('/en/about');
        cy.get('#static-page-about').should('exist');

        cy.contains('a', 'FAQ').click();
        cy.get('#static-page-faq').should('exist');
        cy.get('[data-test=faq-entries]').should('exist');

        cy.contains('a', 'Terms of service').click();
        cy.get('#static-page-terms').should('exist');

        cy.contains('a', 'Privacy').click();
        cy.get('#static-page-privacy').should('exist');
    });
});
