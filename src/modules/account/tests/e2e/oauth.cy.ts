/**
 * @module
 * End-to-end coverage for the OAuth login buttons against the backend's `fake` provider — the
 * actual click-through Google/GitHub cannot get in CI. `fake` skips the consent screen but still
 * round-trips the real `state` cookie, so the button click exercises the genuine redirect chain:
 * BE start route → BE callback → cookies set → FE `/oauth/callback`.
 * Demo-only, since `fake` is gated behind `isDemoMode()` on the backend.
 */

/**
 * Registers `oauth.demo@example.com` with a password and leaves the address unproven —
 * the squatter's half of a pre-account-takeover, and the starting state for both tests below.
 *
 * @param password - the password to register, so a test can prove which one still works
 */
const signUpUnverified = (password: string) => {
    cy.visit('/en/signup');
    cy.get('[type=email]').should('not.be.disabled').clear();
    cy.get('[type=email]').should('not.be.disabled').type('oauth.demo@example.com');
    cy.get('[type=password]').eq(0).should('not.be.disabled').type(password);
    cy.get('[type=password]').eq(1).should('not.be.disabled').type(password);
    cy.get('[type=checkbox]').check();
    cy.get('#signup-page button[type="submit"]').click();
    // Signed in as `unverified` from here — signup sets the session cookies.
    cy.get('#home-page').should('exist');
    cy.logout();
};

describe('Social login (OAuth)', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
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

    /*
     * Pre-account-takeover. Whoever typed the password first does not own the address until they
     * prove it, so the provider's word alone must not hand the account over: otherwise the
     * victim's own Google sign-in drops them into an account the squatter still has a password to.
     */
    it('refuses to link onto an account that never proved the address', () => {
        cy.skipUnlessDemo();

        signUpUnverified('Squatter_Pass1!');

        cy.visit('/en/login');
        cy.get('[data-test=oauth-fake]').should('exist').click();

        // Refused at the callback, with its own code — the remedy is the password reset, not
        // "verify with the provider".
        cy.url().should('include', 'error=account_unverified');
        cy.get('#oauth-callback-page').should('exist');
        cy.get('#home-page').should('not.exist');

        // And nothing was linked: the account is still exactly as unproven as it was.
        cy.visit('/en/login');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').should('not.be.disabled').type('oauth.demo@example.com');
        cy.get('[type=password]').should('not.be.disabled').clear();
        cy.get('[type=password]').should('not.be.disabled').type('Squatter_Pass1!');
        cy.get('form').submit();
        cy.url().should('not.include', '/login');
        cy.get('[data-test=verify-banner]').should('exist');
    });

    it('links to an existing password account once that account has proved the email', () => {
        cy.skipUnlessDemo();

        signUpUnverified('Original_Pass1!');

        // ── Prove the address the ordinary way, from the signup mail ───────────────────
        cy.demoEmailTo('oauth.demo@example.com').then(({ token }) => {
            cy.visit(`/en/verify-email/confirm?token=${token}`);
        });
        cy.get('[data-test=verify-submit]').click();
        cy.get('#home-page').should('exist');
        cy.logout();

        // ── Now the provider may link onto it ─────────────────────────────────────────
        cy.visit('/en/login');
        cy.get('[data-test=oauth-fake]').should('exist').click();
        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');

        // The SAME account, not a duplicate — same address, and nothing left to verify.
        cy.visit('/en/profile');
        cy.get('[type=email]').should('have.value', 'oauth.demo@example.com');
        cy.get('[data-test=verify-banner]').should('not.exist');

        // The original password still opens it — linking added a second way in, it did not
        // replace the first.
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
