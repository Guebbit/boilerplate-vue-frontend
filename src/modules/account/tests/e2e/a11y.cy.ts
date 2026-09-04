/**
 * @module
 * Route list for this module's own a11y sweep — the mechanism lives in
 * `tests/support/e2e/a11y-sweep.ts`; this file only names the routes and states to audit.
 *
 * Co-located so deleting the module deletes its a11y coverage with it; a central list would be
 * left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts` asserts
 * every routed module has one of these, so the split cannot quietly lose a domain.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';
import { E2E_ACCOUNTS } from '../../../../../tests/support/e2e/accounts';

/*
 * The three confirm pages take a one-time token from the email link. A token the demo outbox
 * issued is spent by the flow specs and cannot be minted from a sweep, so these are audited with
 * a token nobody issued: the page renders its form (token prefilled from the query, the rest of
 * the fields empty) exactly as it does for a real link, and only the submit would differ. That
 * is the state a visitor with an expired link lands in, which is worth auditing in its own
 * right.
 */
const UNISSUED_TOKEN = 'a-token-nobody-issued';

sweepA11y('account — guest', [
    ['login', '/en/login'],
    ['signup', '/en/signup'],
    ['password reset', '/en/password-reset'],
    ['password reset confirm', `/en/password-reset/confirm?token=${UNISSUED_TOKEN}`],
    ['account delete confirm', `/en/account-delete/confirm?token=${UNISSUED_TOKEN}`],
    ['verify email confirm', `/en/verify-email/confirm?token=${UNISSUED_TOKEN}`],
    // The success path redirects immediately and renders nothing of its own, same as `Logout` —
    // only the error state (a card plus a link back to login) is a page worth auditing.
    ['oauth callback, error', '/en/oauth/callback?error=access_denied'],
    { name: 'login, dark theme', route: '/en/login', theme: 'dark' },
    {
        // Submitted empty: the sign-in form showing both of its errors — the state that has to
        // tie each message to its field and announce it, not only colour the border.
        name: 'login, submitted empty',
        route: '/en/login',
        prepare: () => {
            cy.get('form button[type=submit]').click();
            cy.get('.v-messages__message').should('be.visible');
        }
    },
    {
        /*
         * Reached through a REAL 2FA login, not `cy.visit('/en/login/2fa')` cold: the challenge is
         * claim-check state the Pinia store holds in memory, not the URL, so a bare visit has
         * nothing to show and bounces straight back to `Login`. This enrolls email 2FA on the
         * demo user account, signs out, then signs back in through the form to reach it for real.
         */
        name: 'login, 2FA challenge',
        route: '/en/login',
        prepare: () => {
            cy.skipUnlessDemo();
            cy.loginAs('user');
            cy.enrollEmailTwoFactor(E2E_ACCOUNTS.user.email);
            cy.logout();
            cy.visit('/en/login');
            cy.get('[type=email]').type(E2E_ACCOUNTS.user.email);
            cy.get('[type=password]').type(E2E_ACCOUNTS.user.password);
            cy.get('form').submit();
            cy.get('#two-factor-challenge-page').should('exist');
        }
    }
]);

sweepA11y(
    'account — signed in',
    [
        ['profile', '/en/profile'],
        {
            // The address dialog: a modal named by its title, with focus inside it, over a
            // page that must be hidden from the reader while it is up.
            name: 'profile, address dialog open',
            route: '/en/profile',
            prepare: () => {
                cy.get('[data-test=address-add]').click();
                cy.get('[data-test=address-dialog]').should('be.visible');
            }
        }
    ],
    'user'
);
