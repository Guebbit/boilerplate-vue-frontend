/// <reference types="cypress" />

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Chainable {
            /**
             * Reset MSW in-memory database state through the test-only reset endpoint.
             */
            resetMockState(): Chainable<void>;

            /**
             * Logs in through the real UI flow using MSW-backed endpoints.
             *
             * @param role - 'user' (default) or 'admin'
             */
            loginAs(role?: 'user' | 'admin'): Chainable<void>;
        }
    }
}

Cypress.Commands.add('resetMockState', () =>
    cy.window().then((windowObject) =>
        windowObject.fetch('/__mock/reset', { method: 'POST' }).then(() => undefined)
    )
);

Cypress.Commands.add('loginAs', (role = 'user') => {
    const credentials =
        role === 'admin'
            ? { email: 'root@root.it', password: 'rootroot' }
            : { email: 'john@example.com', password: 'rootroot' };

    cy.visit('/en/login');
    cy.get('[type=email]').clear().type(credentials.email);
    cy.get('[type=password]').clear().type(credentials.password);
    cy.get('form').submit();
    cy.url().should('not.include', '/login');
});
