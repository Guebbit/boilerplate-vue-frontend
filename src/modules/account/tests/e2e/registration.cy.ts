/**
 * @module
 * End-to-end registration arc across page reloads: signup lands SIGNED IN as `unverified`, then
 * the emailed token is spent as a guest, then the password gate is proven real (wrong password
 * refused, right one accepted).
 *
 * The arc deliberately crosses page reloads the way the real flow does: the verification link is
 * "opened from the inbox" (`cy.demoEmailTo` reads the demo backend's `/__test/emails`), a fresh
 * page load, so the account has to genuinely exist server-side for the second half to work. The
 * logout in the middle is what makes the token-spending half a GUEST's — the link is opened from
 * a mailbox, which may not be on the device that signed up.
 */
describe('Registration', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
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
        // Specifically the required one: a second, optional checkbox (`analyticsConsent`) now
        // shares this form, and `[type=checkbox]` would check both.
        cy.get('[data-test=signup-terms-accepted] input[type=checkbox]').check();
        cy.get('#signup-page button[type="submit"]').click();

        // Signed in from the first moment: `POST /account/signup` sets the session cookies, so
        // the new account lands on Home as `unverified` — wearing the banner, not shut out.
        cy.get('#home-page').should('exist');
        cy.get('[data-test=verify-banner]').should('exist');

        // Back to being a guest, so the emailed link below is opened the way a real one is.
        cy.logout();

        // ── The verification email ──────────────────────────────────────────────────
        cy.demoEmailTo('new.customer@example.com').then((email) => {
            expect(email.template).to.equal('account.verify-request');
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
        // Specifically the required one: a second, optional checkbox (`analyticsConsent`) now
        // shares this form, and `[type=checkbox]` would check both.
        cy.get('[data-test=signup-terms-accepted] input[type=checkbox]').check();
        cy.get('#signup-page button[type="submit"]').click();

        // No login step at all: the banner is up before the visitor has touched their inbox,
        // which is the point — a warning first met at the till arrives too late.
        cy.get('#home-page').should('exist');
        cy.get('[data-test=verify-banner]').should('exist');
        cy.visit('/en/profile');
        cy.get('[data-test=verify-banner]').should('exist');

        // Pressing Resend hands back the server's own cooldown, and the button honours it rather
        // than letting the next press spend a 429.
        cy.get('[data-test=verify-resend]').click();
        cy.get('[data-test=verify-resend]').should('be.disabled');

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
