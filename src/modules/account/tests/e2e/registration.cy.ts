/**
 * Registration, end to end and honestly: the account exists because the form was filled in, the
 * token works because it came out of the (mock) email, and the password that logs in at the end
 * is the one typed at the start — with the wrong one refused first, to prove the check is real.
 *
 * The arc deliberately crosses page reloads the way the real flow does: the verification link is
 * "opened from the inbox" (`cy.demoEmailTo` reads the demo backend's `/__demo/emails`), which is a fresh page load —
 * the account journal in the account mock handlers is what carries the new user across it, the
 * same way the real database would.
 */
describe('Registration', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en');
    });

    it('a visitor signs up, spends the emailed token as a guest, and logs in verified', function () {
        cy.skipUnlessDemo();

        // ── Sign up ─────────────────────────────────────────────────────────────────
        cy.visit('/en/signup');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('new.customer@example.com');
        cy.get('[type=password]').eq(0).should('not.be.disabled').type('BrandNew_Pass1!');
        cy.get('[type=password]').eq(1).should('not.be.disabled').type('BrandNew_Pass1!');
        cy.get('[type=checkbox]').check();
        cy.get('#signup-page button[type="submit"]').click();

        // No auto-login: the form hands over to the login page and the email does the rest.
        cy.get('#login-page').should('exist');

        // ── The verification email ──────────────────────────────────────────────────
        cy.demoEmailTo('new.customer@example.com').then((email) => {
            expect(email.template).to.equal('account.verify-request.ejs');
            expect(email.token, 'the emailed verification token').to.be.a('string');
            // Following the link is a fresh page load, as a guest — the token is the credential.
            cy.visit(`/en/verify-email/confirm?token=${email.token}`);
        });
        cy.get('[data-test=verify-submit]').click();
        cy.contains('Email address verified').should('exist');
        cy.get('#home-page').should('exist');

        // ── The password gate is real: wrong one refused, right one in ──────────────
        cy.visit('/en/login');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('new.customer@example.com');
        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('not-what-was-chosen');
        cy.get('form').submit();
        cy.get('#login-page').should('exist');
        cy.url().should('include', '/login');

        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('BrandNew_Pass1!');
        cy.get('form').submit();
        cy.url().should('not.include', '/login');

        // Verified at the end of the arc — the banner has nothing to ask for.
        cy.visit('/en/profile');
        cy.get('#profile-page').should('exist');
        cy.get('[data-test=verify-banner]').should('not.exist');
    });

    it('an unverified account shows the banner until the emailed token is spent', function () {
        cy.skipUnlessDemo();

        cy.visit('/en/signup');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('slow.reader@example.com');
        cy.get('[type=password]').eq(0).should('not.be.disabled').type('Another_Pass1!');
        cy.get('[type=password]').eq(1).should('not.be.disabled').type('Another_Pass1!');
        cy.get('[type=checkbox]').check();
        cy.get('#signup-page button[type="submit"]').click();
        cy.get('#login-page').should('exist');

        // Log in WITHOUT touching the email first: the account works, but wears the banner.
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('slow.reader@example.com');
        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('Another_Pass1!');
        cy.get('form').submit();
        cy.url().should('not.include', '/login');
        cy.visit('/en/profile');
        cy.get('[data-test=verify-banner]').should('exist');

        // Now open the signup email and spend its token; the banner goes.
        cy.demoEmailTo('slow.reader@example.com').then(({ token }) => {
            cy.visit(`/en/verify-email/confirm?token=${token}`);
        });
        cy.get('[data-test=verify-submit]').click();
        cy.get('#home-page').should('exist');
        cy.visit('/en/profile');
        cy.get('[data-test=verify-banner]').should('not.exist');
    });
});
