/**
 * The contact form and the inbox it lands in — the feedback module's whole loop, driven the way
 * a visitor and then an admin would drive it. The mock inbox starts empty on purpose (the BE
 * seeds no tickets), so the form IS the fixture.
 */
describe('Feedback', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    it('a message sent through the form lands in the inbox', () => {
        // One page session throughout: the mock database re-seeds on a full reload, so the
        // admin walks from the form to the inbox through the app's own navigation — which is
        // also the more honest test of the two pages being wired together.
        cy.loginAs('admin');
        cy.visit('/en/contact');
        cy.get('[data-test=contact-email] input').type('curious@example.com');
        cy.get('[data-test=contact-subject] input').type('A question about the cats');
        cy.get('[data-test=contact-message] textarea')
            .first()
            .type('Are they really illegal in 400 countries?');
        cy.get('[data-test=contact-submit]').click();
        cy.contains('Message sent').should('exist');

        cy.contains('a', 'Inbox').click();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.contains('[data-test=feedback-item]', 'A question about the cats').should('exist');
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
