/// <reference types="cypress" />

const RESET_MOCK_MAX_ATTEMPTS = 10;
const RESET_MOCK_RETRY_DELAY_MS = 200;
const APP_READY_TIMEOUT_MS = 15_000;

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
    cy.window().then(async (windowObject) => {
        let lastError: unknown;
        for (let attempt = 0; attempt < RESET_MOCK_MAX_ATTEMPTS; attempt += 1) {
            try {
                const response = await windowObject.fetch('/__mock/reset', { method: 'POST' });
                if (response.ok) return;
                lastError = `Mock reset returned HTTP ${response.status}`;
            } catch (error) {
                // Ignore transient failures while MSW starts, then retry.
                lastError = error;
            }
            await new Promise((resolve) => {
                setTimeout(resolve, RESET_MOCK_RETRY_DELAY_MS);
            });
        }
        throw new Error(
            `Unable to reset mock state after ${RESET_MOCK_MAX_ATTEMPTS} attempts.${
                lastError ? ` Last error: ${String(lastError)}` : ''
            }`
        );
    })
);

// After every cy.visit(), wait until the app has fully bootstrapped:
// MSW running + Vue mounted + initial router navigation resolved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Cypress.Commands.overwrite('visit', (originalFunction: any, url: any, options: any) => {
    originalFunction(url, options);
    cy.window({ timeout: APP_READY_TIMEOUT_MS }).should('have.property', '_appReady', true);
});

Cypress.Commands.add('loginAs', (role = 'user') => {
    const credentials =
        role === 'admin'
            ? { email: 'root@root.it', password: 'rootroot' }
            : { email: 'root@root.it', password: 'rootroot' };

    cy.visit('/en/login');
    cy.get('[type=email]').clear();
    cy.get('[type=email]').type(credentials.email);
    cy.get('[type=password]').clear();
    cy.get('[type=password]').type(credentials.password);
    cy.get('form').submit();
    cy.url().should('not.include', '/login');
});
