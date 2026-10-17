// requires-module: account
/**
 * @module
 * AC21 · It was not me. Someone with a stolen session changes the account's address. The old
 * address is told, and its undo link takes the account back: while the change is pending, and
 * after it was confirmed. Only the newest request's link counts, a spent link is dead, and a
 * session that was signed in under the thief's address is cut by the undo.
 *
 * The story needs a mailbox (the notice goes to the OLD address, the proof to the new one). Time
 * passes with `letTimePass`, because two changes must be a minute apart; a live run waits it out.
 * The seven-day expiry of the undo link and the freed-address race are not walked here: the
 * backend's integration tests pin them, and a week's jump would end every session of the shard.
 */
import { loginDevice, refreshDevice, requestAsDevice } from '../../../support/e2e/harness';
import { byTemplate, expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';
import { letTimePass, loginDeviceWith, submitLoginForm } from '../../../support/e2e/security-steps';
import { carriesAnotherLink } from '../../../support/e2e/steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** Where the first, honest-looking change goes. */
const FIRST = 'ac21-first@example.com';

/** Where the second change goes: it supersedes the first. */
const SECOND = 'ac21-second@example.com';

/** The thief's address, which gets confirmed. */
const THIEF = 'ac21-thief@example.com';

/** The backend refuses two changes closer than a minute (`EMAIL_CHANGE_TOO_SOON`). */
const ONE_CHANGE_APART_MS = 61_000;

/** The notice the OLD address gets when a change is requested. */
const NOTICE = 'account.email-change-notice';

/**
 * Asks, from the profile, for the address to change, and waits until the page parks it.
 *
 * @param address - the new address
 */
const requestChangeTo = (address: string): void => {
    cy.visit('/en/profile');
    cy.get('#profile-page [type=email]').should('not.be.disabled').clear();
    cy.get('#profile-page [type=email]').should('not.be.disabled').type(address);
    cy.get('#profile-page form button[type=submit]').first().click();
    cy.get('[data-test=pending-email-notice]').should('contain.text', address);
};

/**
 * The undo link in the newest notice the old address holds that is not one of `known`.
 *
 * @param oldAddress - where the notices go
 * @param known - links already seen
 * @returns a chain yielding the link as mailed
 */
const newUndoLink = (oldAddress: string, known: string[]): Cypress.Chainable<string> =>
    cy
        .emailTo(
            oldAddress,
            (mail) =>
                byTemplate(NOTICE)(mail) && known.every((link) => carriesAnotherLink(link)(mail))
        )
        .then((mail) => {
            expectMailTemplate(mail, NOTICE);
            return mailedLinkUrl(mail);
        });

/**
 * The confirmation link the new address was mailed.
 *
 * @param address - the new address
 * @returns a chain yielding the link as mailed
 */
const confirmLinkOf = (address: string): Cypress.Chainable<string> =>
    cy.emailTo(address, byTemplate('account.verify-request')).then(mailedLinkUrl);

/**
 * Opens a mailed undo link and presses the button.
 *
 * @param link - the link as mailed
 */
const spendUndo = (link: string): void => {
    // Home first: two links differ only in the `#token=` fragment, which does not reload a page.
    cy.visit('/en');
    cy.visit(link);
    cy.get('[data-test=email-change-undo-submit]').click();
};

/**
 * Opens a mailed confirmation link and presses the button.
 *
 * @param link - the link as mailed
 */
const spendConfirm = (link: string): void => {
    cy.visit('/en');
    cy.visit(link);
    cy.get('[data-test=email-change-submit]').click();
};

describe('AC21 · It was not me', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the old address takes the account back, pending or confirmed, and a spent link is dead', () => {
        cy.skipUnlessMailbox();

        cy.accountOf('user').then(({ email: seed, password }) => {
            cy.step('the account is open here and on a second device; a change is requested');
            cy.loginAs('user');
            loginDevice('user').then((device) => {
                requestChangeTo(FIRST);

                cy.step('the old address is told, with an undo link; the new one gets the proof');
                newUndoLink(seed, []).then((firstUndo) => {
                    cy.emailTo(seed, byTemplate(NOTICE)).then((notice) => {
                        expect(notice.subject).to.contain('Your email address is changing');
                        expect(
                            mailMentions(notice, FIRST),
                            'the notice names the new address'
                        ).to.equal(true);
                    });
                    confirmLinkOf(FIRST).then((firstConfirm) => {
                        cy.step('a newer request kills the older undo link');
                        letTimePass(ONE_CHANGE_APART_MS);
                        requestChangeTo(SECOND);
                        newUndoLink(seed, [firstUndo]).then((secondUndo) => {
                            spendUndo(firstUndo);
                            cy.get('[data-test=email-change-undo-error]').should('not.be.empty');

                            cy.step('undoing a pending change in a signed-in tab ends that tab');
                            confirmLinkOf(SECOND).then((secondConfirm) => {
                                spendUndo(secondUndo);
                                cy.contains('The email change was undone').should('exist');
                                cy.get('#login-page').should('exist');
                                cy.get('[data-test=user-menu]').should('not.exist');
                                refreshDevice(device).its('status').should('equal', 401);

                                cy.step('the cancelled change cannot be confirmed any more');
                                spendConfirm(secondConfirm);
                                cy.get('[data-test=email-change-confirm-error]').should(
                                    'not.be.empty'
                                );
                                spendConfirm(firstConfirm);
                                cy.get('[data-test=email-change-confirm-error]').should(
                                    'not.be.empty'
                                );
                            });

                            cy.step('the old address signs in, and nothing is pending');
                            submitLoginForm(seed, password);
                            cy.get('#home-page').should('exist');
                            cy.visit('/en/profile');
                            cy.get('[data-test=pending-email-notice]').should('not.exist');

                            cy.step('a confirmed change moves the account to the thief’s address');
                            letTimePass(ONE_CHANGE_APART_MS);
                            requestChangeTo(THIEF);
                            newUndoLink(seed, [firstUndo, secondUndo]).then((thiefUndo) => {
                                confirmLinkOf(THIEF).then((thiefConfirm) => {
                                    spendConfirm(thiefConfirm);
                                    cy.contains('Email address changed').should('exist');
                                });
                                submitLoginForm(seed, password);
                                cy.get('[data-test=login-error]').should('not.be.empty');
                                loginDeviceWith(THIEF, password).then((thiefDevice) => {
                                    requestAsDevice(thiefDevice, 'GET', '/account')
                                        .its('status')
                                        .should('equal', 200);

                                    cy.step('undoing after the confirm gives the address back');
                                    spendUndo(thiefUndo);
                                    cy.contains('The email change was undone').should('exist');
                                    submitLoginForm(THIEF, password);
                                    cy.get('[data-test=login-error]').should('not.be.empty');
                                    submitLoginForm(seed, password);
                                    cy.get('#home-page').should('exist');
                                    cy.visit('/en/profile');
                                    cy.get('#profile-page [type=email]').should('have.value', seed);

                                    cy.step('the thief’s own session is cut by the undo');
                                    requestAsDevice(thiefDevice, 'GET', '/account')
                                        .its('status')
                                        .should('equal', 401);
                                });

                                cy.step('the same undo link, spent twice, changes nothing');
                                spendUndo(thiefUndo);
                                cy.get('[data-test=email-change-undo-error]').should(
                                    'not.be.empty'
                                );
                                cy.visit('/en/profile');
                                cy.get('#profile-page [type=email]').should('have.value', seed);
                            });
                        });
                    });
                });
            });
        });
    });
});
