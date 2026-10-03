// requires-module: account, users
/**
 * @module
 * AC20 · The link in my mail went stale. A mailed link is good for a while and once: a verify link
 * dies after a day, a reset link after an hour, a deletion link the moment it is used. Each dead
 * link answers on its own page, in words, and a fresh request works. The last half is the invite:
 * an admin creates a user (a setup mail always goes out), and the recipient sets a password from it.
 *
 * Time passes by moving the demo backend's clock (`cy.travel`), so this is a demo-only journey.
 * The windows are the backend's `NODE_EMAIL_VERIFY_TTL_MS` (24 h) and `NODE_PASSWORD_RESET_TTL_MS`
 * (1 h); the deletion link's hour is fixed in the code.
 */
import { expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';
import { carriesAnotherLink, signInWith, signUp } from '../../../support/e2e/steps';

/** Past the reset window (1 h), well inside the verify window (24 h). */
const PAST_AN_HOUR_MS = 2 * 60 * 60 * 1000;

/** Enough more, on top of {@link PAST_AN_HOUR_MS}, to be past the verify window too. */
const PAST_A_DAY_MS = 23 * 60 * 60 * 1000;

/** The address of the account made to delete itself. */
const DOOMED_EMAIL = 'doomed.link@example.com';

/** Its password, and any password that clears the strength rule. */
const PASSWORD = 'Stale_Link_Pass1!';

/** The password set from a fresh reset link. */
const RESET_PASSWORD = 'Rewritten_Pass1!';

/** The invited user's address, and the password they choose from the invite. */
const INVITEE_EMAIL = 'invited.person@example.com';

/** The password the invitee sets. */
const INVITEE_PASSWORD = 'Invited_Pass1!';

/**
 * Opens a mailed link and presses the page's confirm button.
 *
 * @param link - the link as mailed
 * @param submit - the confirm button's selector on that page
 */
const followAndConfirm = (link: string, submit: string): void => {
    cy.visit(link);
    cy.get(submit).click();
};

/**
 * On the reset/setup page already open, types a new password twice and submits.
 *
 * @param password - the password to set
 */
const setPasswordFromLink = (password: string): void => {
    cy.get('#password-reset-confirm-page [type=password]')
        .eq(0)
        .should('not.be.disabled')
        .type(password);
    cy.get('#password-reset-confirm-page [type=password]').eq(1).type(password);
    cy.get('#password-reset-confirm-page button[type=submit]').click();
};

/**
 * Asks for a password-reset mail from the public form.
 *
 * @param email - the account's address
 */
const requestReset = (email: string): void => {
    cy.visit('/en/password-reset');
    cy.get('#password-reset-request-page [type=email]').should('not.be.disabled').type(email);
    cy.get('#password-reset-request-page button[type=submit]').click();
    cy.contains('If the account exists').should('exist');
};

describe('AC20 · The link in my mail went stale', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a day-old verify link, an hour-old reset link and a used deletion link each say so; fresh ones work; an invite sets a password', () => {
        cy.skipUnlessDemo();

        cy.step('an unverified customer asks for the verify mail, and someone asks for a reset');
        cy.loginAs('unverified');
        cy.get('[data-test=verify-resend]').should('not.be.disabled').click();
        cy.accountOf('unverified').then(({ email }) => {
            cy.emailTo(email).then((mail) => {
                expectMailTemplate(mail, 'account.verify-request');
                cy.wrap(mailedLinkUrl(mail)).as('verifyLink');
            });
        });
        cy.logout();
        cy.accountOf('user').then(({ email }) => {
            requestReset(email);
            cy.emailTo(email).then((mail) => {
                expectMailTemplate(mail, 'account.reset-request');
                cy.wrap(mailedLinkUrl(mail)).as('resetLink');
            });
        });

        cy.step('a deletion link used once is dead the second time');
        signUp(DOOMED_EMAIL, PASSWORD);
        cy.visit('/en/profile');
        cy.get('[data-test=profile-delete-account] button').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.emailTo(DOOMED_EMAIL, (mail) => mail.template === 'account.delete-request').then(
            (mail) => {
                const link = mailedLinkUrl(mail);
                followAndConfirm(link, '#account-delete-confirm-page button[type=submit]');
                cy.get('#home-page').should('exist');
                followAndConfirm(link, '#account-delete-confirm-page button[type=submit]');
                cy.get('[data-test=account-delete-confirm-error]').should('not.be.empty');
            }
        );

        cy.step('two hours pass: the reset link is refused on its page');
        cy.travel(PAST_AN_HOUR_MS);
        cy.get<string>('@resetLink').then((link) => {
            cy.visit(link);
            setPasswordFromLink(RESET_PASSWORD);
        });
        cy.get('[data-test=password-reset-confirm-error]').should('not.be.empty');

        cy.step('a day passes: the verify link is refused too');
        cy.travel(PAST_A_DAY_MS);
        cy.get<string>('@verifyLink').then((link) => {
            followAndConfirm(link, '[data-test=verify-submit]');
        });
        cy.get('[data-test=verify-email-confirm-error]').should('not.be.empty');

        cy.step('a fresh verify mail works');
        cy.loginAs('unverified');
        cy.get<string>('@verifyLink').then((stale) => {
            cy.get('[data-test=verify-resend]').should('not.be.disabled').click();
            cy.accountOf('unverified').then(({ email }) => {
                cy.emailTo(email, carriesAnotherLink(stale)).then((mail) => {
                    followAndConfirm(mailedLinkUrl(mail), '[data-test=verify-submit]');
                });
            });
        });
        cy.get('#home-page').should('exist');
        cy.get('[data-test=verify-banner]').should('not.exist');
        cy.logout();

        cy.step('a fresh reset mail works, and the new password signs in');
        cy.accountOf('user').then(({ email }) => {
            requestReset(email);
            cy.get<string>('@resetLink').then((stale) => {
                cy.emailTo(email, carriesAnotherLink(stale)).then((mail) => {
                    cy.visit(mailedLinkUrl(mail));
                });
            });
            setPasswordFromLink(RESET_PASSWORD);
            cy.get('#login-page').should('exist');
            signInWith(email, RESET_PASSWORD);
        });
        cy.logout();

        cy.step('an admin invites a person: no password is typed, a setup mail goes out');
        cy.loginAs('admin');
        cy.visit('/en/users/create');
        cy.get('[data-test=user-email] input').type(INVITEE_EMAIL);
        cy.get('[data-test=user-username] input').type('invited-person');
        cy.get('form').submit();
        cy.url().should('not.include', '/create');
        cy.logout();

        cy.step('the invitee lands on the password page from the mail, sets one, and signs in');
        cy.emailTo(INVITEE_EMAIL).then((mail) => {
            expectMailTemplate(mail, 'account.setup-request');
            cy.visit(mailedLinkUrl(mail));
        });
        setPasswordFromLink(INVITEE_PASSWORD);
        cy.get('#login-page').should('exist');
        signInWith(INVITEE_EMAIL, INVITEE_PASSWORD);
    });
});
