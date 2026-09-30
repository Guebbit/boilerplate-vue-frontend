// requires-module: account
/**
 * @module
 * AC4 · My laptop was stolen. "Log out everywhere" from one device ends the others: the
 * other device's refresh is refused, and once its short-lived access token has lapsed its next
 * request lands on the login page. Revoking the current session logs this tab out cleanly.
 *
 * Two devices, because a second browser is not available: the page is one, and `loginDevice` is
 * the other — a real login that keeps its own refresh cookie. The clock-driven half moves the
 * demo backend's clock past the 600 s access-token life (`NODE_TOKEN_ACCESS_TIME`), so only that
 * `it` is demo-only.
 */
import { loginDevice, refreshDevice, requestAsDevice } from '../../../support/e2e/harness';

/** Past the access token's 600 s life, inside the refresh token's 7 days. */
const PAST_ACCESS_TOKEN_MS = 610_000;

describe('AC4 · My laptop was stolen', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('logging out everywhere from this tab ends the other device', () => {
        cy.step('the customer is signed in on this tab and on another device');
        cy.loginAs('user');
        loginDevice('user').then((device) => {
            cy.visit('/en/profile');
            cy.get('[data-test=sessions-list] [data-test=session-item]').should('have.length', 2);
            cy.get('[data-test=session-current]').should('have.length', 1);

            cy.step('the other device can still renew its session');
            refreshDevice(device).its('status').should('equal', 200);

            cy.step('log out everywhere, confirmed');
            cy.get('[data-test=sessions-logout-everywhere]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=nav-login-link]').should('exist');

            cy.step('the other device can no longer renew: its session is gone');
            refreshDevice(device).its('status').should('equal', 401);

            cy.step('and this tab is signed out too: a protected page sends me to login');
            cy.visit('/en/profile');
            cy.url().should('include', '/login');
        });
    });

    it('the stolen device cannot renew its session once its access token lapses', () => {
        cy.skipUnlessDemo();

        cy.step('this tab is the stolen laptop, open on the profile');
        cy.loginAs('user');
        cy.navigateViaMenu('account', '/en/profile');
        cy.get('#profile-page').should('exist');

        loginDevice('user').then((owner) => {
            cy.step('the owner logs out everywhere from their own device');
            requestAsDevice(owner, 'POST', '/account/logout-all')
                .its('status')
                .should('equal', 200);

            cy.step(
                'the tab’s access token has minutes left, so a click inside the app still works'
            );
            cy.navigateViaMenu('account', '/en/orders');
            cy.get('#orders-list-page').should('exist');

            cy.step('once the token lapses the tab cannot renew it: the refresh is refused');
            cy.intercept('GET', '**/account/refresh').as('refresh');
            cy.travel(PAST_ACCESS_TOKEN_MS);
            cy.navigateViaMenu('account', '/en/returns');
            cy.wait('@refresh').its('response.statusCode').should('equal', 401);

            cy.step('the tab says so and sends me to login, remembering where I was going');
            cy.contains('Your session has expired').should('exist');
            cy.get('#login-page').should('exist');
            cy.url().should('include', '/login').and('include', 'continue');
            cy.get('[data-test=user-menu]').should('not.exist');
        });
    });

    it('revoking the current session logs this tab out cleanly', () => {
        cy.step('the customer revokes the session this tab is using');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get(
            '[data-test=session-item]:has([data-test=session-current]) [data-test=session-revoke]'
        ).click();

        cy.step('the tab is signed out, not left showing a dead session');
        cy.get('[data-test=nav-login-link]').should('exist');
        cy.getCookie('jwt').should('not.exist');

        cy.step('a protected page sends me to login');
        cy.visit('/en/profile');
        cy.url().should('include', '/login');
    });
});
