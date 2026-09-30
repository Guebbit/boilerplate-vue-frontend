// requires-module: account
/**
 * @module
 * AC2 · An authenticator app (TOTP). The customer enrols an authenticator from the secret the
 * enrolment screen shows, signs in with a code, replaces the authenticator using a backup code
 * (the lost-phone route), and finally turns 2FA off with a code from the new one, after which
 * login asks for nothing.
 *
 * The code an app would show is computed in Cypress' Node process with the same `otplib` the
 * backend verifies with (`totpCodeFor`). The backend accepts a step only once and one step of
 * drift either way, so each later code is minted a step ahead, and one real 30-second wait lets
 * the last code that needs to be fresh be so. Runs on both profiles; needs no mailbox.
 */
import { totpCodeFor } from '../../../support/e2e/harness';
import {
    dismissBackupCodes,
    loginToChallenge,
    revealedBackupCodes,
    submitLoginForm
} from '../../../support/e2e/security-steps';

/** Longer than one TOTP step, so the next code is genuinely newer than the last one used. */
const ONE_STEP_MS = 31_000;

/** Where the TOTP secret sits inside the enrolment dialog's manual-entry sentence. */
const SECRET_PATTERN = /[2-7A-Z]{16,}/;

/**
 * Reads the base32 secret off the open enrolment dialog.
 *
 * @returns a chain yielding the secret
 */
const secretOnScreen = (): Cypress.Chainable<string> =>
    cy
        .get('[data-test=two-factor-enroll-secret]')
        .invoke('text')
        .then((text) => {
            const secret = SECRET_PATTERN.exec(text)?.[0];
            expect(secret, 'a base32 secret in the manual-entry text').to.be.a('string');
            return String(secret);
        });

/**
 * Types a code into the enrolment dialog and confirms it.
 *
 * @param code - the six digits
 */
const confirmEnrolment = (code: string): void => {
    cy.get('[data-test=two-factor-enroll-code] input').clear();
    cy.get('[data-test=two-factor-enroll-code] input').type(code);
    cy.get('[data-test=two-factor-enroll-confirm]').click();
};

/**
 * Signs in to the challenge page and answers it with one code.
 *
 * @param account - the login
 * @param account.email - the address
 * @param account.password - the password
 * @param code - the six digits to try
 */
const signInWithCode = (account: { email: string; password: string }, code: string): void => {
    loginToChallenge(account);
    cy.get('[data-test=two-factor-challenge-code] input').type(code);
    cy.get('[data-test=two-factor-challenge-submit]').click();
};

describe('AC2 · An authenticator app', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('enrols from the secret, signs in with a code, replaces it with a backup code, and turns 2FA off', () => {
        cy.accountOf('user').then((account) => {
            cy.step('the customer adds an authenticator and reads the secret off the screen');
            cy.loginAs('user');
            cy.visit('/en/profile');
            cy.get('[data-test=two-factor-add-totp]').click();
            secretOnScreen().then((first) => {
                cy.step('a wrong code is refused, and the right one arms it');
                confirmEnrolment('000000');
                cy.get('[data-test=two-factor-enroll-error]').should('not.be.empty');
                totpCodeFor(first, 0).then(confirmEnrolment);
                cy.get('[data-test=two-factor-backup-codes]').should('be.visible');
                revealedBackupCodes().then((backupCodes) => {
                    dismissBackupCodes();
                    cy.get('[data-test=two-factor-armed]').should('exist');

                    cy.step('at login a wrong code is refused, the right one signs in');
                    cy.logout();
                    loginToChallenge(account);
                    cy.get('[data-test=two-factor-challenge-send]').should('not.exist');
                    cy.get('[data-test=two-factor-challenge-code] input').type('000000');
                    cy.get('[data-test=two-factor-challenge-submit]').click();
                    cy.get('[data-test=two-factor-challenge-submit-error]').should('not.be.empty');
                    cy.get('#two-factor-challenge-page').should('exist');
                    cy.get('[data-test=two-factor-challenge-code] input').clear();
                    totpCodeFor(first, 1).then((code) => {
                        cy.get('[data-test=two-factor-challenge-code] input').type(code);
                    });
                    cy.get('[data-test=two-factor-challenge-submit]').click();
                    cy.get('#home-page').should('exist');

                    cy.step(
                        'the phone is lost: replace the authenticator, proved with a backup code'
                    );
                    cy.visit('/en/profile');
                    cy.get('[data-test=two-factor-replace-totp]').click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=two-factor-code-prompt-input] input').type(backupCodes[0]);
                    cy.get('[data-test=two-factor-code-prompt-submit]').click();
                    secretOnScreen().then((second) => {
                        expect(second, 'a fresh secret').to.not.equal(first);
                        totpCodeFor(second, 0).then(confirmEnrolment);
                        cy.get('[data-test=two-factor-enroll]').should('not.exist');
                        cy.get('[data-test=two-factor-armed]').should('exist');

                        cy.step('the old authenticator no longer signs in; the new one does');
                        cy.logout();
                        totpCodeFor(first, 2).then((stale) => {
                            signInWithCode(account, stale);
                        });
                        cy.get('[data-test=two-factor-challenge-submit-error]').should(
                            'not.be.empty'
                        );
                        cy.get('#two-factor-challenge-page').should('exist');
                        cy.get('[data-test=two-factor-challenge-code] input').clear();
                        totpCodeFor(second, 1).then((code) => {
                            cy.get('[data-test=two-factor-challenge-code] input').type(code);
                        });
                        cy.get('[data-test=two-factor-challenge-submit]').click();
                        cy.get('#home-page').should('exist');

                        cy.step('turning 2FA off asks for a code from the new authenticator');
                        // The last code used was this step's neighbour; wait for the next.
                        // eslint-disable-next-line cypress/no-unnecessary-waiting -- the backend accepts a TOTP step once, and only real time makes the next one newer
                        cy.wait(ONE_STEP_MS);
                        cy.visit('/en/profile');
                        cy.get('[data-test=two-factor-disable-all]').click();
                        cy.get('[data-test=app-dialog-confirm]').click();
                        totpCodeFor(second, 1).then((code) => {
                            cy.get('[data-test=two-factor-code-prompt-input] input').type(code);
                        });
                        cy.get('[data-test=two-factor-code-prompt-submit]').click();
                        cy.get('[data-test=two-factor-armed]').should('not.exist');

                        cy.step('and the next login asks for no code at all');
                        cy.logout();
                        submitLoginForm(account.email, account.password);
                        cy.get('#home-page').should('exist');
                    });
                });
            });
        });
    });
});
