/// <reference types="cypress" />

/**
 * Steps the account-security journeys (AC1, AC13, AC16, AC17) walk the same way: the login form
 * up to the point the backend answers, and the backup-codes screen read as text.
 *
 * Plain functions over `cy`, like `steps.ts`; they name no state of their own.
 */
import type { Device } from './harness';

/**
 * Types credentials into the login form and submits, without asserting where it leads — a
 * wrong password, a 2FA challenge and a session are all valid answers to this step.
 *
 * @param email - the account's address
 * @param password - the password to try
 */
export const submitLoginForm = (email: string, password: string): void => {
    cy.visit('/en/login');
    cy.get('[type=email]').should('not.be.disabled').clear();
    cy.get('[type=email]').type(email);
    cy.get('[type=password]').clear();
    cy.get('[type=password]').type(password);
    cy.get('form').submit();
};

/**
 * Logs in as a seeded account whose 2FA is armed and stops on the challenge page.
 *
 * @param account - the login `cy.accountOf` yielded
 * @param account.email - the address
 * @param account.password - the password
 */
export const loginToChallenge = (account: { email: string; password: string }): void => {
    submitLoginForm(account.email, account.password);
    cy.get('#two-factor-challenge-page').should('exist');
};

/**
 * On the challenge page, switches to the backup-code field and submits one code.
 *
 * @param code - a single-use backup code
 */
export const submitBackupCode = (code: string): void => {
    cy.get('[data-test=two-factor-challenge-use-backup-code]').click();
    cy.get('[data-test=two-factor-challenge-code] input').clear();
    cy.get('[data-test=two-factor-challenge-code] input').type(code);
    cy.get('[data-test=two-factor-challenge-submit]').click();
};

/**
 * The codes the one-time reveal screen lists, trimmed.
 *
 * @returns a chain yielding every code shown
 */
export const revealedBackupCodes = (): Cypress.Chainable<string[]> =>
    cy
        .get('[data-test=backup-codes-list] li')
        .then(($items) => $items.toArray().map((item) => item.textContent.trim()));

/** Acknowledges the reveal screen and closes it — the codes are gone for good after this. */
export const dismissBackupCodes = (): void => {
    cy.get('[data-test=backup-codes-confirm-saved]').click();
    cy.get('[data-test=backup-codes-continue]').click();
    cy.get('[data-test=two-factor-backup-codes]').should('not.exist');
};

/**
 * Signs in as a second device with credentials the seed does not know — an account whose
 * password a journey has already changed. `loginDevice` covers the seeded ones.
 *
 * @param email - the account's address
 * @param password - its current password
 * @returns a chain yielding the device, for `refreshDevice` and `requestAsDevice`
 */
export const loginDeviceWith = (email: string, password: string): Cypress.Chainable<Device> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.task<Device>('deviceLogin', { apiUrl: String(apiUrl), email, password })
        );

/**
 * Lets time pass: the demo backend's clock jumps, a live backend is waited out in real time.
 * For a window measured in seconds (a resend cooldown, a token's grace period) that both
 * profiles have; a journey that needs a long jump uses `cy.travel` and is demo-only.
 *
 * @param ms - how long, in milliseconds
 */
export const letTimePass = (ms: number): void => {
    cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile !== true) {
            cy.travel(ms);
            return;
        }
        // A live backend's clock cannot be moved, so the window is waited out in real time.
        cy.wait(ms);
    });
};
