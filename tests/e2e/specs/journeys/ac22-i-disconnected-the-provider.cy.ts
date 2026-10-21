// requires-module: account
/**
 * @module
 * AC22 · I disconnected the provider. An account that signs in with a password AND with a
 * provider drops the provider from its profile. The removal asks for the password again when the
 * fresh-login window has lapsed, the owner is mailed that a sign-in method went, the password
 * still signs in, a reset mail says no provider is connected, and the provider can no longer walk
 * back in: its next sign-in is refused (nothing links by email match) until the owner connects it
 * again from a signed-in profile.
 *
 * Demo only: the fake OAuth provider exists only there, and the fresh-login window lapses by
 * moving the demo backend's clock (`cy.travel`).
 */
import { byTemplate, expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';
import { requestReset, submitLoginForm, submitReset } from '../../../support/e2e/security-steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** The address the fake provider hands back, pre-verified. */
const EMAIL = 'oauth.demo@example.com';

/** The account's own password, the way in that must outlive the provider. */
const PASSWORD = 'Original_Pass1!';

/** What the reset replaces it with. */
const RESET_PASSWORD = 'Rewritten_Pass1!';

/** Past the sensitive window (900 s); the access token has lapsed too, so a refresh comes first. */
const PAST_SENSITIVE_MS = 1_000_000;

/** The notice the owner gets when a sign-in method is added or removed. */
const METHOD_NOTICE = 'account.sign-in-method-changed';

/**
 * Registers the account with a password and proves the address from the signup mail, as someone
 * opening the link on another device would (a guest tab), then leaves everyone signed out.
 */
const registerAndVerify = (): void => {
    cy.visit('/en/signup');
    cy.get('[type=email]').should('not.be.disabled').clear();
    cy.get('[type=email]').should('not.be.disabled').type(EMAIL);
    cy.get('[type=password]').eq(0).should('not.be.disabled').type(PASSWORD);
    cy.get('[type=password]').eq(1).should('not.be.disabled').type(PASSWORD);
    cy.get('[type=checkbox]').check();
    cy.get('#signup-page button[type="submit"]').click();
    cy.get('#home-page').should('exist');
    cy.logout();
    cy.emailTo(EMAIL).then(({ token }) => {
        cy.visit(`/en/verify-email/confirm#token=${token}`);
    });
    cy.get('[data-test=verify-submit]').click();
    cy.get('#home-page').should('exist');
};

/**
 * Signs in with the password, opens the profile and connects the fake provider from it.
 *
 * @param password - the password to sign in with
 */
const signInAndConnectProvider = (password: string): void => {
    submitLoginForm(EMAIL, password);
    cy.url().should('not.include', '/login');
    cy.visit('/en/profile');
    cy.get('[data-test=connected-connect-fake]').should('exist').click();
    cy.url().should('include', '/en/profile');
    cy.get('[data-test=connected-item]').should('have.length', 1);
};

describe('AC22 · I disconnected the provider', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the password stays, a reset says no provider is left, and the provider is refused until it is connected again', () => {
        cy.skipUnlessDemo();

        cy.step('an account with a password connects the provider from its profile');
        registerAndVerify();
        signInAndConnectProvider(PASSWORD);
        cy.get('[data-test=connected-item]').should('contain.text', 'Connected');
        cy.emailTo(
            EMAIL,
            (mail) => byTemplate(METHOD_NOTICE)(mail) && mailMentions(mail, 'was connected')
        );

        cy.step('the fresh-login window lapses, and removing the provider asks for the password');
        cy.travel(PAST_SENSITIVE_MS);
        cy.get('[data-test=connected-remove]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=reauth-dialog]').should('be.visible');

        cy.step('a wrong password is refused and the provider stays; the right one carries on');
        cy.get('[data-test=reauth-dialog-password] input').type('not-the-password');
        cy.get('[data-test=reauth-dialog-submit]').click();
        cy.get('[data-test=reauth-dialog-password] .v-messages__message').should('exist');
        cy.get('[data-test=reauth-dialog]').should('be.visible');
        cy.get('[data-test=reauth-dialog-password] input').clear();
        cy.get('[data-test=reauth-dialog-password] input').type(PASSWORD);
        cy.get('[data-test=reauth-dialog-submit]').click();
        cy.contains('Provider disconnected.').should('exist');
        cy.get('[data-test=connected-empty]').should('exist');
        cy.get('[data-test=connected-item]').should('not.exist');

        cy.step('the owner is told a sign-in method was removed');
        cy.emailTo(
            EMAIL,
            (mail) => byTemplate(METHOD_NOTICE)(mail) && mailMentions(mail, 'was removed')
        );

        cy.step('the password still signs in');
        cy.logout();
        submitLoginForm(EMAIL, PASSWORD);
        cy.url().should('not.include', '/login');
        cy.logout();

        cy.step('a reset says no provider is connected, and replaces the password');
        requestReset(EMAIL);
        cy.emailTo(EMAIL, byTemplate('account.reset-request')).then((mail) => {
            expectMailTemplate(mail, 'account.reset-request');
            cy.visit(mailedLinkUrl(mail));
        });
        submitReset(RESET_PASSWORD);
        cy.get('#login-page').should('exist');
        cy.emailTo(
            EMAIL,
            (mail) =>
                byTemplate('account.reset-confirm')(mail) &&
                mailMentions(mail, 'No Google or GitHub sign-in is connected')
        );

        cy.step('the provider no longer reaches the account: its sign-in is refused, no session');
        cy.visit('/en/login');
        cy.get('[data-test=oauth-fake]').should('exist').click();
        cy.url().should('include', 'error=account_exists');
        cy.get('#oauth-callback-page').should('exist');
        cy.get('[data-test=user-menu]').should('not.exist');

        cy.step(
            'signed in with the new password, nothing is connected, and Connect brings it back'
        );
        submitLoginForm(EMAIL, RESET_PASSWORD);
        cy.url().should('not.include', '/login');
        cy.visit('/en/profile');
        cy.get('[data-test=connected-empty]').should('exist');
        cy.get('[data-test=connected-connect-fake]').should('exist').click();
        cy.url().should('include', '/en/profile');
        cy.get('[data-test=connected-item]').should('have.length', 1);
    });
});
