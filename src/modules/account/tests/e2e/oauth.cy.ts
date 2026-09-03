/**
 * @module
 * End-to-end coverage for the OAuth login buttons against the backend's `fake` provider
 * (`SOCIAL_LOGIN_ADD.md`) — the actual click-through Google/GitHub cannot get in CI. `fake` skips
 * the consent screen but still round-trips the real `state` cookie, so the button click exercises
 * the genuine redirect chain: BE start route → BE callback → cookies set → FE `/oauth/callback`.
 * Demo-only, since `fake` is gated behind `isDemoMode()` on the backend.
 */
describe('Social login (OAuth)', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en');
    });

    it('a new visitor signs in through the fake provider and lands home, already verified', () => {
        cy.skipUnlessDemo();

        cy.visit('/en/login');
        cy.get('[data-test=oauth-fake]').should('exist').click();

        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');
        cy.get('[data-test=user-menu]').should('exist');

        // The identity the fake provider hands back is pre-verified, so a brand-new account
        // created from it needs no emailed token — same as `loginOrCreateFromOAuth`'s create
        // branch documents.
        cy.visit('/en/profile');
        cy.get('[type=email]').should('have.value', 'oauth.demo@example.com');
        cy.get('[data-test=verify-banner]').should('not.exist');
    });

    it('links to an existing password account sharing the verified email, not a duplicate', () => {
        cy.skipUnlessDemo();

        // ── An unverified password account with the SAME email the fake identity uses ──
        cy.visit('/en/signup');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('oauth.demo@example.com');
        cy.get('[type=password]').eq(0).should('not.be.disabled').type('Original_Pass1!');
        cy.get('[type=password]').eq(1).should('not.be.disabled').type('Original_Pass1!');
        cy.get('[type=checkbox]').check();
        cy.get('#signup-page button[type="submit"]').click();
        cy.get('#login-page').should('exist');

        // ── Sign in via the fake provider instead of finishing email verification ──────
        cy.get('[data-test=oauth-fake]').should('exist').click();
        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');

        // Linking a verified provider identity marks the account verified too, without the
        // emailed token ever being spent — proof this landed on the SAME account, not a new one.
        cy.visit('/en/profile');
        cy.get('[type=email]').should('have.value', 'oauth.demo@example.com');
        cy.get('[data-test=verify-banner]').should('not.exist');

        // The original password still opens the same account — linking added a second way in,
        // it did not replace the first.
        cy.logout();
        cy.visit('/en/login');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('oauth.demo@example.com');
        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('Original_Pass1!');
        cy.get('form').submit();
        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');
    });
});
