/// <reference types="cypress" />

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Chainable {
            /**
             * Sets the isAuth cookie and mocks the refresh-token + profile endpoints so
             * that the authentication middleware can hydrate Pinia on every page load,
             * without needing a real backend.
             *
             * @param role - 'user' (default) or 'admin'
             */
            loginAs(role?: 'user' | 'admin'): Chainable<void>;
        }
    }
}

Cypress.Commands.add('loginAs', (role = 'user') => {
    const profileFixture = role === 'admin' ? 'auth/admin-profile' : 'auth/profile';

    // The isAuth cookie tells refreshAuth() there may be a valid refresh token,
    // so it will call GET /account/refresh → GET /account on each page load.
    cy.setCookie('isAuth', 'true');
    cy.intercept('GET', Cypress.env('apiUrl') + '/account/refresh', { fixture: 'auth/login' });
    cy.intercept('GET', Cypress.env('apiUrl') + '/account', { fixture: profileFixture });
});
