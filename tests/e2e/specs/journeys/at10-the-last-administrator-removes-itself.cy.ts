// requires-module: account, api-keys, users
/**
 * @module
 * AT10 · The last administrator removes itself. The shop's one administrator switches its own
 * account off through "manage access", warned once, and nothing stops it: there is no guard and
 * no repair command, by decision (a locked-out shop is fixed in the database by a technician).
 * This story pins the lock-out and only that. The session ends at once, the login is refused, the
 * admin-only pages are shut to everyone who is left, and no remaining staff role may hand the
 * administrator role out again (a role may only grant what it holds). Nor may it switch the
 * account back on: a moderator ranks below an administrator, so there is no repair through the
 * app, and none is offered.
 */
import { loginDevice, requestAsDevice } from '../../../support/e2e/harness';

/**
 * Follows an address the signed-in role may not use: Home, with a notice.
 *
 * @param path - the locale-prefixed address
 */
const isTurnedBack = (path: string): void => {
    cy.visit(path);
    cy.get('#home-page').should('exist');
    cy.location('pathname').should('equal', '/en');
    cy.get('.v-alert').should('exist');
};

describe('AT10 · The last administrator removes itself', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the administrator switches itself off, is signed out and refused, and nobody left can restore the role', () => {
        cy.step('the administrator opens its own page and starts to switch itself off');
        cy.accountInRole('admin').then(({ id: adminId }) => {
            cy.loginAs('admin');
            cy.visit(`/en/users/${adminId}`);
            cy.intercept('PATCH', '**/users/*').as('saveAccess');
            cy.get('[data-test=user-manage-access]').click();
            cy.get('[data-test=user-access-active] input').uncheck({ force: true });
            cy.get('[data-test=user-access-continue]').click();

            cy.step('it is warned that it is about to lock itself out, and confirms anyway');
            cy.get('[data-test=user-access-self-warning]').should('exist');
            cy.get('[data-test=user-access-confirm]').click();
            cy.wait('@saveAccess').its('response.statusCode').should('equal', 200);

            cy.step('the next page it opens does not let it in: it is back at the login');
            cy.visit('/en/users');
            cy.get('#login-page').should('exist');

            cy.step('the login is refused with its own password');
            cy.accountOf('admin').then(({ email, password }) => {
                cy.get('[type=email]').should('not.be.disabled').type(email);
                cy.get('[type=password]').should('not.be.disabled').type(password);
                cy.get('form').submit();
            });
            cy.get('[data-test=login-error]').should('exist');
            cy.url().should('include', '/login');

            cy.step('the moderator is left, and the administrator-only pages are shut to it');
            cy.loginAs('moderator');
            isTurnedBack('/en/api-keys');

            cy.step('and it cannot hand the administrator role out again');
            cy.accountInRole('user').then(({ id: customerId }) => {
                loginDevice('moderator').then((device) => {
                    requestAsDevice(device, 'PATCH', `/users/${customerId}`, {
                        role: 'admin'
                    })
                        .its('status')
                        .should('equal', 409);
                });
                cy.apiAs<{ role: string }>('moderator', 'GET', `/users/${customerId}`).then(
                    (customer) => {
                        expect(customer?.role).to.equal('customer');
                    }
                );
            });

            cy.step('nor can it switch the administrator back on: there is no repair in the app');
            cy.visit(`/en/users/${adminId}`);
            cy.get('[data-test=user-go-to-edit]').should('not.exist');
            cy.get('[data-test=user-manage-access]').should('not.exist');
            loginDevice('moderator').then((device) => {
                requestAsDevice(device, 'PATCH', `/users/${adminId}`, { active: true })
                    .its('status')
                    .should('equal', 403);
            });
            cy.apiAs<{ active: boolean }>('moderator', 'GET', `/users/${adminId}`).then(
                (administrator) => {
                    expect(administrator?.active).to.equal(false);
                }
            );
        });
    });
});
