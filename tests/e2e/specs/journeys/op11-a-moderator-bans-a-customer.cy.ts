// requires-module: account, users
/**
 * @module
 * OP11 · A moderator bans a customer. From the user's page the moderator opens "manage access",
 * switches the account off and confirms a second time. The ban bites at once: the backend reads
 * the account on every request, so a device the customer was already signed in on is turned away
 * on its very next call (no waiting out a token), and a fresh login is refused. Switching the
 * account back on lets them in again.
 *
 * The customer's other device is a server-side login (`loginDevice`): the page's own session is
 * the moderator's.
 */
import { loginDevice, requestAsDevice } from '../../../support/e2e/harness';

/**
 * Walks the moderator through the access dialog for one account: open it, flip the switch, go to
 * the confirmation, confirm.
 *
 * @param userId - whose account
 * @param active - the state to leave it in; `false` bans
 */
const setAccessActive = (userId: string, active: boolean): void => {
    cy.visit(`/en/users/${userId}`);
    cy.intercept('PATCH', '**/users/*').as('saveAccess');
    cy.get('[data-test=user-manage-access]').click();
    if (active) cy.get('[data-test=user-access-active] input').check({ force: true });
    else cy.get('[data-test=user-access-active] input').uncheck({ force: true });
    cy.get('[data-test=user-access-continue]').click();
    cy.get('[data-test=user-access-confirm]').click();
    cy.wait('@saveAccess').its('response.statusCode').should('equal', 200);
};

/**
 * Types the seeded customer's credentials into the login form and sends it.
 */
const submitCustomerLogin = (): void => {
    cy.accountOf('user').then(({ email, password }) => {
        cy.visit('/en/login');
        cy.get('[type=email]').should('not.be.disabled').type(email);
        cy.get('[type=password]').should('not.be.disabled').type(password);
        cy.get('form').submit();
    });
};

describe('OP11 · A moderator bans a customer', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the ban turns the customer away on the next request, login stays refused, and reactivating lets them in', () => {
        cy.accountInRole('user').then(({ id: customerId }) => {
            cy.step('the customer is signed in on another device and can read their account');
            loginDevice('user').then((device) => {
                requestAsDevice(device, 'GET', '/account').its('status').should('equal', 200);

                cy.step('the moderator switches the account off, and confirms');
                cy.loginAs('moderator');
                setAccessActive(customerId, false);

                cy.step('the very next request from the customer’s device is refused');
                requestAsDevice(device, 'GET', '/account').its('status').should('equal', 401);

                cy.step('and a fresh login is refused too');
                cy.logout();
                submitCustomerLogin();
                cy.get('[data-test=login-error]').should('exist');
                cy.url().should('include', '/login');

                cy.step('the moderator switches it back on');
                cy.visit('/en/login');
                cy.accountOf('moderator').then(({ email, password }) => {
                    cy.get('[type=email]').should('not.be.disabled').type(email);
                    cy.get('[type=password]').should('not.be.disabled').type(password);
                    cy.get('form').submit();
                });
                cy.url().should('not.include', '/login');
                setAccessActive(customerId, true);

                cy.step('the customer can sign in again');
                cy.logout();
                submitCustomerLogin();
                cy.url().should('not.include', '/login');
                cy.get('[data-test=user-menu]').should('exist');
            });
        });
    });
});
