/**
 * @module
 * End-to-end forgot-password flow: the reset token is read from the demo backend's email outbox
 * rather than assumed, so the test proves the emailed link is the one that works.
 *
 * Both halves of the outcome are proven at the login form — the old password stops working AND
 * the new one starts. `cy.demoEmailTo` reads the demo backend's `/__demo/emails` outbox, so these
 * specs only mean something against the demo profile.
 */
describe('Password reset', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en');
    });

    it('the emailed link replaces the forgotten password', function () {
        cy.skipUnlessDemo();

        // ── Ask for the link ────────────────────────────────────────────────────────
        cy.visit('/en/password-reset');
        cy.get('#password-reset-request-page [type=email]')
            .should('not.be.disabled')
            .type('gino@pino.it');
        cy.get('#password-reset-request-page button[type=submit]').click();
        // The enumeration-safe acknowledgement, same words whether the account exists or not.
        cy.contains('If the account exists').should('exist');

        // ── Open the email, follow the link ─────────────────────────────────────────
        cy.demoEmailTo('gino@pino.it').then((email) => {
            expect(email.template).to.equal('account.reset-request');
            cy.visit(`/en/password-reset/confirm?token=${email.token}`);
        });
        cy.get('#password-reset-confirm-page [type=password]')
            .eq(0)
            .should('not.be.disabled')
            .type('Rewritten_Pass1!');
        cy.get('#password-reset-confirm-page [type=password]')
            .eq(1)
            .should('not.be.disabled')
            .type('Rewritten_Pass1!');
        cy.get('#password-reset-confirm-page button[type=submit]').click();
        cy.get('#login-page').should('exist');

        // ── The proof, both directions ──────────────────────────────────────────────
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('gino@pino.it');
        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('password'); // yesterday's password
        cy.get('form').submit();
        cy.get('#login-page').should('exist');
        cy.url().should('include', '/login');

        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('Rewritten_Pass1!');
        cy.get('form').submit();
        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');
    });

    it('a token nobody was sent changes nothing', function () {
        cy.skipUnlessDemo();

        cy.visit('/en/password-reset/confirm?token=a-token-nobody-issued');
        cy.get('#password-reset-confirm-page [type=password]')
            .eq(0)
            .should('not.be.disabled')
            .type('Hopeful_Pass1!');
        cy.get('#password-reset-confirm-page [type=password]')
            .eq(1)
            .should('not.be.disabled')
            .type('Hopeful_Pass1!');
        cy.get('#password-reset-confirm-page button[type=submit]').click();

        // Refused: no redirect to login, and the success copy never shows.
        cy.get('#password-reset-confirm-page').should('exist');
        cy.contains('Password updated successfully').should('not.exist');

        // And the old password still works — nothing moved.
        cy.loginAs('user');
        cy.get('#home-page').should('exist');
    });
});
