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
