// requires-module: account
/**
 * @module
 * AC13 · My password, start to finish. Changing it from the profile and recovering it from the
 * mailed link, with what goes wrong on the way: a known-breached password is warned about on all
 * three forms that set one, a wrong current password and a wrong login are refused in the API's
 * own words, and every other device is signed out by a change and by a reset. A reset link works
 * once, and asking for one for an unknown address gives nothing away.
 *
 * The second device is `loginDevice`; "signed out" is its refresh answering 401. The mailed link
 * and the notice are read from the demo outbox or live Mailpit, so the journey needs a mailbox.
 */
import { refreshDevice, loginDevice } from '../../../support/e2e/harness';
import { loginDeviceWith, submitLoginForm } from '../../../support/e2e/security-steps';
import { expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';

/** On the backend's bundled breach list, and strong enough to pass the composition rules. */
const BREACHED = 'Password1!';

/** A fresh password, for the change. */
const CHANGED = 'Changed_Secret1!';

/** A fresh password, for the reset. */
const RESET = 'Recovered_Secret1!';

/** The enumeration-safe acknowledgement a reset request answers with, whoever asked. */
const ACKNOWLEDGEMENT = 'If the account exists';

/**
 * Types the profile's three password fields and submits, with the form open.
 *
 * @param current - the current password to offer
 * @param next - the new password, typed into both fields
 */
const submitPasswordChange = (current: string, next: string): void => {
    cy.get('[data-test=current-password] input').should('not.be.disabled').clear();
    cy.get('[data-test=current-password] input').type(current);
    cy.get('[data-test=new-password] input').clear();
    cy.get('[data-test=new-password] input').type(next);
    cy.get('[data-test=new-password-confirm] input').clear();
    cy.get('[data-test=new-password-confirm] input').type(next);
    cy.get('[data-test=submit-password-change]').click();
};

/**
 * Asks for a reset link for an address, from the forgot-password page.
 *
 * @param address - who to send it to
 */
const requestReset = (address: string): void => {
    cy.visit('/en/password-reset');
    cy.get('[data-test=password-reset-email] input').should('not.be.disabled').clear();
    cy.get('[data-test=password-reset-email] input').type(address);
    cy.get('#password-reset-request-page button[type=submit]').click();
    cy.contains(ACKNOWLEDGEMENT).should('exist');
};

/**
 * Fills the reset confirmation form's two password fields and submits.
 *
 * @param password - the new password, typed twice
 */
const submitReset = (password: string): void => {
    cy.get('#password-reset-confirm-page [type=password]').eq(0).should('not.be.disabled').clear();
    cy.get('#password-reset-confirm-page [type=password]').eq(0).type(password);
    cy.get('#password-reset-confirm-page [type=password]').eq(1).clear();
    cy.get('#password-reset-confirm-page [type=password]').eq(1).type(password);
    cy.get('#password-reset-confirm-page button[type=submit]').click();
};

/**
 * The "your password was changed" notice after a reset. Only the demo outbox records which
 * template a mail came from; an SMTP inbox has only the rendered message, so live skips this.
 *
 * @param address - the recipient
 */
const expectResetNoticeMailed = (address: string): void => {
    cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile === true) return;
        cy.emailTo(address, (mail) => mail.template === 'account.reset-confirm');
    });
};

describe('AC13 · My password, start to finish', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('a change and a reset each replace the password and sign the other devices out', () => {
        cy.skipUnlessMailbox();

        cy.accountOf('user').then(({ email, password: original }) => {
            cy.step('the customer is signed in here and on another device');
            cy.loginAs('user');
            loginDevice('user').then((phone) => {
                cy.visit('/en/profile');
                cy.get('[data-test=toggle-change-password]').click();

                cy.step(
                    'a breached new password is warned about, and refused with the API’s reason'
                );
                cy.get('[data-test=new-password] input').should('not.be.disabled').type(BREACHED);
                cy.get('[data-test=password-breach-warning]').should('be.visible');
                submitPasswordChange(original, BREACHED);
                // The refusal belongs to the new-password field, so it reads under it.
                cy.get('[data-test=new-password] .v-messages__message')
                    .should('contain.text', 'data breach')
                    .and('not.contain.text', 'Unprocessable Entity');

                cy.step('a wrong current password is refused in words, and I stay in');
                submitPasswordChange('not-my-password', CHANGED);
                cy.get('[data-test=password-change-error]').should(
                    'contain.text',
                    'The current password is incorrect.'
                );

                cy.step(
                    'a valid change goes through; the other device is signed out, this tab is not'
                );
                submitPasswordChange(original, CHANGED);
                cy.contains('Password changed').should('exist');
                refreshDevice(phone).its('status').should('equal', 401);
                cy.reload();
                cy.get('#profile-page').should('exist');
                cy.get('[data-test=user-menu]').should('exist');
            });

            cy.step('the old password no longer signs in; the new one does');
            cy.logout();
            submitLoginForm(email, original);
            cy.get('[data-test=login-error]').should('not.be.empty');
            cy.url().should('include', '/login');
            submitLoginForm(email, CHANGED);
            cy.url().should('not.include', '/login');
            cy.get('#home-page').should('exist');

            cy.step(
                'I forget it anyway: the reset link is mailed, and a second device is signed in'
            );
            loginDeviceWith(email, CHANGED).then((tablet) => {
                cy.logout();
                requestReset(email);
                cy.emailTo(email).then((mail) => {
                    expectMailTemplate(mail, 'account.reset-request');
                    const link = mailedLinkUrl(mail);

                    cy.step('the reset page warns about a breached password too');
                    cy.visit(link);
                    cy.get('#password-reset-confirm-page [type=password]')
                        .eq(0)
                        .should('not.be.disabled')
                        .type(BREACHED);
                    cy.get('[data-test=password-breach-warning]').should('be.visible');

                    cy.step('submitting it anyway is refused, and does not burn the link');
                    submitReset(BREACHED);
                    cy.get(
                        '[data-test=password-reset-confirm-error], #password-reset-confirm-page .v-messages__message'
                    ).should('contain.text', 'data breach');
                    cy.get('#password-reset-confirm-page').should('exist');

                    cy.step('a good password replaces it, and the notice is mailed');
                    submitReset(RESET);
                    cy.get('#login-page').should('exist');
                    expectResetNoticeMailed(email);
                    refreshDevice(tablet).its('status').should('equal', 401);

                    cy.step('the same link, opened again, changes nothing');
                    cy.visit(link);
                    submitReset('Another_Secret1!');
                    cy.get('[data-test=password-reset-confirm-error]').should('not.be.empty');
                    cy.get('#password-reset-confirm-page').should('exist');
                });

                cy.step('the password from before the reset is dead, the reset one signs in');
                submitLoginForm(email, CHANGED);
                cy.get('[data-test=login-error]').should('not.be.empty');
                submitLoginForm(email, RESET);
                cy.get('#home-page').should('exist');
            });

            cy.step('an address nobody has gets exactly the same acknowledgement');
            cy.logout();
            requestReset('nobody-at-all@example.com');
        });
    });

    it('the signup form warns about a breached password as it is typed', () => {
        cy.visit('/en/signup');
        cy.get('[type=password]').eq(0).should('not.be.disabled').type(BREACHED);
        cy.get('[data-test=password-breach-warning]').should('be.visible');
    });
});
