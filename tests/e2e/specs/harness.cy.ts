// requires-module: none
/**
 * @module
 * The journey harness itself: `cy.travel` and the persona accounts. A journey spec leans on both,
 * so they are proven once here rather than by whichever journey lands first. `cy.step`'s failure
 * prefix is a pure function, tested in `tests/unit/scripts/e2e/step-prefix.spec.ts`.
 *
 * The clock is demo-only (the backend's `/__test/clock`), so that case opens with
 * `cy.skipUnlessDemo()`; the persona cases run on both profiles.
 */
import { seedAccount } from '../../support/e2e/scenario';

/** One hour, in milliseconds. */
const HOUR_MS = 3_600_000;

/** Real time that passes between two reads of the clock. */
const DRIFT_MS = 5000;

/**
 * The demo clock's offset from real time, in milliseconds.
 *
 * @returns a chain yielding the backend's `offsetMs`
 */
const clockOffset = (): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) => cy.request(`${String(apiUrl)}/__test/clock`))
        .then((response) => (response.body as { offsetMs: number }).offsetMs);

describe('The journey harness', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('cy.travel', () => {
        it('moves the backend clock forward, and a restore puts it back', () => {
            cy.skipUnlessDemo();

            clockOffset().should('be.lessThan', DRIFT_MS);

            cy.step('jumps an hour ahead');
            cy.travel(HOUR_MS);
            clockOffset().should('be.gte', HOUR_MS - DRIFT_MS);

            cy.step('restores');
            cy.restore();
            clockOffset().should('be.lessThan', DRIFT_MS);
        });
    });

    describe('the persona accounts', () => {
        it('are all described by the backend, the two-factor one with its backup codes', () => {
            for (const role of ['unverified', 'twoFactor', 'pendingEmail', 'banned'] as const)
                expect(seedAccount(role).email, role).to.contain('@');

            expect(seedAccount('twoFactor').backupCodes, 'backup codes').to.have.length(5);
        });

        it('can sign in as the unverified and the pending-email accounts', () => {
            cy.loginAs('unverified');
            cy.get('[data-test=user-menu]').should('exist');
            cy.logout();

            cy.loginAs('pendingEmail');
            cy.get('[data-test=user-menu]').should('exist');
        });

        it('stops the two-factor account at the challenge', () => {
            cy.visit('/en/login');
            cy.get('[type=email]').type(seedAccount('twoFactor').email);
            cy.get('[type=password]').type(seedAccount('twoFactor').password);
            cy.get('form').submit();

            cy.get('#two-factor-challenge-page').should('exist');
        });

        it('refuses the banned account a session', () => {
            cy.visit('/en/login');
            cy.get('[type=email]').type(seedAccount('banned').email);
            cy.get('[type=password]').type(seedAccount('banned').password);
            cy.get('form').submit();

            cy.url().should('include', '/login');
            cy.get('[data-test=user-menu]').should('not.exist');
        });
    });
});
