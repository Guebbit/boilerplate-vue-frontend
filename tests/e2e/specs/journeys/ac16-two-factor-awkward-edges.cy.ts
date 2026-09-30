// requires-module: account
/**
 * @module
 * AC16 · Two-factor, the awkward edges. A fresh signup cannot arm email 2FA until the address is
 * proved, and the panel says why in the server's words. Once verified, replacing the factor and
 * then cancelling leaves the panel telling the truth. At login the resend button counts down,
 * the sixth wrong guess is refused, and a challenge that has expired disables its submit and
 * shows the way back.
 *
 * Needs a mailbox for the verification link and every code. NOT covered: an email-only user
 * turning 2FA off without spending a backup code. The prompt has no "send code" and no endpoint
 * sends one to a signed-in session, so the journey for it waits on a contract change (JB17).
 */
import { signInWith, signUp } from '../../../support/e2e/steps';
import { mailedLinkUrl } from '../../../support/e2e/commands';
import {
    dismissBackupCodes,
    letTimePass,
    submitLoginForm
} from '../../../support/e2e/security-steps';

/** The address the new customer signs up with. */
const EMAIL = 'awkward.edges@example.com';

/** A password that clears the strength rule. */
const PASSWORD = 'Awkward_Edges1!';

/** A delivered code is refused for a further send this long (`DELIVERED_CODE_RESEND_SECONDS` + margin). */
const PAST_RESEND_COOLDOWN_MS = 31_000;

/** Wrong guesses one login challenge tolerates (`NODE_MFA_CHALLENGE_MAX`). */
const GUESSES_ALLOWED = 5;

/** Longer than the challenge's own 10-minute life. */
const PAST_CHALLENGE_MS = 11 * 60_000;

/**
 * Arms email 2FA from the panel: add, read the mailed code and confirm.
 *
 * @param mintsBackupCodes - whether the account has no backup codes yet, so the confirm reveals
 *  a fresh set to dismiss. An account that already holds codes keeps them (they recover the
 *  account, not the method).
 */
const armEmailFromPanel = (mintsBackupCodes: boolean): void => {
    cy.get('[data-test=two-factor-add-email]').click();
    cy.get('[data-test=two-factor-enroll]').should('be.visible');
    cy.typeMailedTwoFactorCode(EMAIL, '[data-test=two-factor-enroll-code] input');
    cy.get('[data-test=two-factor-enroll-confirm]').click();
    if (mintsBackupCodes) {
        cy.get('[data-test=two-factor-backup-codes]').should('be.visible');
        dismissBackupCodes();
    }
    cy.get('[data-test=two-factor-armed]').should('exist');
};

/**
 * Types one guess into the login challenge, submits it, and expects the API's answer.
 *
 * @param code - what to type
 * @param expectedStatus - the HTTP status the API should answer with
 */
const guess = (code: string, expectedStatus: number): void => {
    cy.intercept('POST', '**/account/login/2fa').as('guess');
    cy.get('[data-test=two-factor-challenge-code] input').clear();
    cy.get('[data-test=two-factor-challenge-code] input').type(code);
    cy.get('[data-test=two-factor-challenge-submit]').click();
    cy.wait('@guess').its('response.statusCode').should('equal', expectedStatus);
};

/**
 * The "your two-factor settings changed" mail. Only the demo outbox records which template a mail
 * came from; an SMTP inbox has only the rendered message, so live skips the template check.
 *
 * @param address - the recipient
 */
const expectChangeNoticeMailed = (address: string): void => {
    cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile === true) return;
        cy.emailTo(address, (mail) => mail.template === 'account.two-factor-changed');
    });
};

describe('AC16 · Two-factor, the awkward edges', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('an unverified account is told why, a cancelled replace shows the truth, and the challenge has its limits', () => {
        cy.skipUnlessMailbox();

        cy.step('a new customer opens the 2FA panel before proving the address');
        signUp(EMAIL, PASSWORD);
        cy.visit('/en/profile');
        cy.get('[data-test=two-factor-unavailable]').should('not.be.empty');
        cy.get('[data-test=two-factor-add-email]').should('not.exist');

        cy.step('verifies the address through the mailed link, then arms email 2FA');
        cy.logout();
        cy.emailTo(EMAIL).then((email) => {
            cy.visit(mailedLinkUrl(email));
        });
        cy.get('[data-test=verify-submit]').click();
        cy.get('#home-page').should('exist');
        signInWith(EMAIL, PASSWORD);
        cy.visit('/en/profile');
        cy.get('[data-test=two-factor-unavailable]').should('not.exist');
        armEmailFromPanel(true);

        cy.step(
            'replacing it names the method, and asks for a code: an email-only account mails itself one'
        );
        cy.get('[data-test=two-factor-replace-email]').should('contain.text', 'Email');
        cy.get('[data-test=two-factor-replace-email]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=two-factor-code-prompt-input] input').type('000000');
        cy.get('[data-test=two-factor-code-prompt-submit]').click();
        cy.get('[data-test=two-factor-code-prompt-error]').should('not.be.empty');
        cy.get('[data-test=two-factor-enroll]').should('not.exist');
        cy.get('[data-test=two-factor-code-prompt-send]').click();
        cy.get('[data-test=two-factor-code-prompt-input] input').clear();
        cy.typeMailedTwoFactorCode(EMAIL, '[data-test=two-factor-code-prompt-input] input');
        cy.get('[data-test=two-factor-code-prompt-submit]').click();

        cy.step('cancelling the enrolment shows what the server holds');
        cy.get('[data-test=two-factor-enroll]').should('be.visible');
        // Cancel only once the setup has answered: that call is what disarms the old factor.
        cy.get('[data-test=two-factor-resend]').should('be.visible');
        cy.get('[data-test=two-factor-enroll-cancel]').click();
        cy.get('[data-test=two-factor-armed]').should('not.exist');
        cy.get('[data-test=two-factor-add-email]').should('exist');

        cy.step('arming it again, once the code-sending cooldown has passed');
        letTimePass(PAST_RESEND_COOLDOWN_MS);
        armEmailFromPanel(false);

        cy.step('at login: send a code, and the resend button is locked with a countdown');
        cy.logout();
        submitLoginForm(EMAIL, PASSWORD);
        cy.get('#two-factor-challenge-page').should('exist');
        cy.get('[data-test=two-factor-challenge-send]').click();
        cy.get('[data-test=two-factor-challenge-send]')
            .should('be.disabled')
            .and('contain.text', 's');

        cy.step('five wrong guesses are answered as wrong, the sixth is refused outright');
        for (let attempt = 1; attempt <= GUESSES_ALLOWED; attempt += 1) guess('000000', 422);
        guess('000000', 429);

        cy.step('that is terminal: the page says why, and the only way on is a fresh login');
        cy.get('[data-test=two-factor-challenge-locked-out]').should('not.be.empty');
        cy.get('[data-test=two-factor-challenge-submit]').should('not.exist');
        cy.get('[data-test=two-factor-challenge-back-to-login]').click();
        cy.get('#login-page').should('exist');

        cy.step('a new login, and a challenge that has expired cannot be submitted');
        submitLoginForm(EMAIL, PASSWORD);
        cy.get('#two-factor-challenge-page').should('exist');
        cy.get('[data-test=two-factor-challenge-back-to-login]').should('exist');
        // The countdown reads the browser's own clock, so that is the one to move.
        cy.clock(Date.now(), ['Date']).as('browserClock');
        cy.get('@browserClock').invoke('tick', PAST_CHALLENGE_MS);
        cy.get('[data-test=two-factor-challenge-submit]').should('be.disabled');
        cy.get('[data-test=two-factor-challenge-back-to-login]').should('exist');
        // Put the real time back: the steps below sign in for real.
        cy.get('@browserClock').invoke('restore');

        cy.step('and the way back to login is offered, as it was all along');
        cy.get('[data-test=two-factor-challenge-back-to-login]').click();
        cy.get('#login-page').should('exist');

        cy.step(
            'an email-only account turns 2FA off by mailing itself the code, spending no backup code'
        );
        submitLoginForm(EMAIL, PASSWORD);
        cy.get('[data-test=two-factor-challenge-send]').click();
        cy.typeMailedTwoFactorCode(EMAIL, '[data-test=two-factor-challenge-code] input');
        cy.get('[data-test=two-factor-challenge-submit]').click();
        cy.get('#home-page').should('exist');
        cy.visit('/en/profile');
        cy.get('[data-test=two-factor-disable-all]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=two-factor-code-prompt-send]').click();
        cy.typeMailedTwoFactorCode(EMAIL, '[data-test=two-factor-code-prompt-input] input');
        cy.get('[data-test=two-factor-code-prompt-submit]').click();
        cy.get('[data-test=two-factor-armed]').should('not.exist');
        cy.get('[data-test=two-factor-add-email]').should('exist');

        cy.step('and the account holder was told, out of band');
        expectChangeNoticeMailed(EMAIL);
    });
});
