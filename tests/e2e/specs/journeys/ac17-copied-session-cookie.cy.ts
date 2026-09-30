// requires-module: account
/**
 * @module
 * AC17 · Someone copied my session cookie. The refresh cookie rotates on every renewal, so an
 * old copy is a stolen one: replayed after the grace window it is refused and every session of
 * the account is revoked, this tab's included. And logging out kills the session on the server,
 * not only in the tab, so a cookie copied before logout refreshes nothing.
 *
 * The thief is `refreshDevice`: a Node request carrying only the copied `jwt` value. The grace
 * window (`NODE_TOKEN_ROTATION_GRACE_MS`, 10 s) passes by moving the demo backend's clock, or by
 * really waiting on the live profile — the cross-origin `:8085` to `:3000` cookie is what that
 * profile adds.
 */
import { refreshDevice, type Device } from '../../../support/e2e/harness';
import { letTimePass } from '../../../support/e2e/security-steps';

/** Longer than the backend's 10 s rotation grace window. */
const PAST_GRACE_MS = 11_000;

/**
 * A thief's device: the copied refresh cookie and nothing else.
 *
 * @param cookieValue - the `jwt` cookie's value as the browser held it
 * @returns a chain yielding the device to hand to `refreshDevice`
 */
const thiefWith = (cookieValue: string): Cypress.Chainable<Device> =>
    cy.env(['apiUrl']).then(({ apiUrl }) => ({
        apiUrl: String(apiUrl),
        token: '',
        cookie: `jwt=${cookieValue}`
    }));

/**
 * The refresh cookie's current value.
 *
 * @returns a chain yielding the value; fails when there is no cookie
 */
const refreshCookieValue = (): Cypress.Chainable<string> =>
    cy
        .getCookie('jwt')
        .should('exist')
        .then((cookie) => String(cookie?.value));

/** Signs in with "remember me" ticked, so the refresh cookie outlives the browser session. */
const loginRememberingMe = (): void => {
    cy.accountOf('user').then(({ email, password }) => {
        cy.visit('/en/login');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').type(email);
        cy.get('[type=password]').clear();
        cy.get('[type=password]').type(password);
        cy.get('[type=checkbox]').check({ force: true });
        cy.get('form').submit();
        cy.get('#home-page').should('exist');
    });
};

describe('AC17 · Someone copied my session cookie', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('an old cookie replayed after the grace window is refused and revokes every session', () => {
        cy.step('the customer signs in with remember me and the cookie is copied');
        loginRememberingMe();
        refreshCookieValue().then((copied) => {
            cy.step('a reload renews the session, so the copy is now one rotation behind');
            cy.intercept('GET', '**/account/refresh').as('refresh');
            cy.reload();
            cy.wait('@refresh').its('response.statusCode').should('equal', 200);
            refreshCookieValue().should('not.equal', copied);

            cy.step('the grace window passes, and the thief replays the copy: refused');
            letTimePass(PAST_GRACE_MS);
            thiefWith(copied).then((thief) => {
                refreshDevice(thief).its('status').should('equal', 401);
            });

            cy.step('the theft revoked every session: this tab’s next page load lands on login');
            cy.visit('/en/profile');
            cy.url().should('include', '/login');
            cy.get('#login-page').should('exist');
        });
    });

    it('logging out kills the session on the server, so a copied cookie refreshes nothing', () => {
        cy.step('the customer signs in and the cookie is copied');
        loginRememberingMe();
        refreshCookieValue().then((copied) => {
            cy.step('the customer logs out');
            cy.logout();
            cy.get('[data-test=nav-login-link]').should('exist');

            cy.step('the copy is dead: the server forgot the session, not just the tab');
            thiefWith(copied).then((thief) => {
                refreshDevice(thief).its('status').should('equal', 401);
            });
        });
    });
});
