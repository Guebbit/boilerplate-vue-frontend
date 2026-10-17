// requires-module: account
/**
 * @module
 * AC24 · Someone is guessing my codes. Each login challenge tolerates five wrong guesses; the
 * account as a whole tolerates ten across challenges. The tenth sets a 15-minute lock and mails
 * the owner, and while it holds even a right code is refused. A password reset lifts it.
 *
 * Starts from the seeded `twoFactor` persona (email 2FA armed, backup codes known). The right
 * code used to prove the lock is a backup code, because it can be spent without a mailbox read;
 * the lock mail needs one. The fifteen-minute expiry of the lock is pinned by the backend's
 * integration test, not walked here.
 */
import {
    loginToChallenge,
    requestReset,
    submitBackupCode,
    submitLoginForm,
    submitReset
} from '../../../support/e2e/security-steps';
import { byTemplate, mailedLinkUrl } from '../../../support/e2e/commands';

/** Wrong guesses one login challenge tolerates (`NODE_MFA_CHALLENGE_MAX`). */
const GUESSES_ALLOWED = 5;

/** The password the reset sets. */
const RESET = 'Guessed_At_Secret1!';

/** The phrase the lock mail's subject carries. */
const LOCKED_SUBJECT = 'Your two-factor checks are locked';

/**
 * Watches the challenge's guesses, once, before the first one (see AC16 on why not per guess).
 */
const watchGuesses = (): void => {
    cy.intercept('POST', '**/account/login/2fa').as('guess');
};

/**
 * Types one wrong code into the open challenge and expects the API's answer.
 *
 * @param expectedStatus - the HTTP status the API should answer with
 */
const guessWrong = (expectedStatus: number): void => {
    cy.get('[data-test=two-factor-challenge-code] input').clear();
    cy.get('[data-test=two-factor-challenge-code] input').type('000000');
    cy.get('[data-test=two-factor-challenge-submit]').click();
    cy.wait('@guess').its('response.statusCode').should('equal', expectedStatus);
};

describe('AC24 · Someone is guessing my codes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('ten wrong codes lock the account, mail the owner, and only a password reset lifts it', () => {
        cy.skipUnlessMailbox();

        cy.accountOf('twoFactor').then((account) => {
            const [backupCode] = account.backupCodes ?? [];
            expect(backupCode, 'a seeded backup code').to.be.a('string');

            cy.step('five wrong guesses are answered as wrong, the sixth is refused outright');
            loginToChallenge(account);
            watchGuesses();
            for (let attempt = 1; attempt <= GUESSES_ALLOWED; attempt += 1) guessWrong(422);
            guessWrong(429);
            cy.get('[data-test=two-factor-challenge-locked-out]').should('not.be.empty');

            cy.step('a new challenge starts the count again, but the account remembers');
            cy.get('[data-test=two-factor-challenge-back-to-login]').click();
            loginToChallenge(account);
            for (let attempt = 1; attempt <= GUESSES_ALLOWED; attempt += 1) guessWrong(422);

            cy.step('the owner is told, with the length of the lock');
            cy.emailTo(account.email, byTemplate('account.two-factor-locked')).then((mail) => {
                expect(mail.subject).to.contain(LOCKED_SUBJECT);
            });

            cy.step('a right code is refused while the lock holds, and is not spent');
            submitLoginForm(account.email, account.password);
            cy.get('#two-factor-challenge-page').should('exist');
            submitBackupCode(backupCode);
            cy.wait('@guess').its('response.statusCode').should('equal', 429);
            cy.get('#home-page').should('not.exist');

            cy.step('a password reset lifts the lock');
            requestReset(account.email);
            cy.emailTo(account.email, byTemplate('account.reset-request')).then((mail) => {
                cy.visit(mailedLinkUrl(mail));
                submitReset(RESET);
                cy.get('#login-page').should('exist');
            });

            cy.step('the new password and the very same backup code sign in');
            submitLoginForm(account.email, RESET);
            cy.get('#two-factor-challenge-page').should('exist');
            submitBackupCode(backupCode);
            cy.get('#home-page').should('exist');
        });
    });
});
