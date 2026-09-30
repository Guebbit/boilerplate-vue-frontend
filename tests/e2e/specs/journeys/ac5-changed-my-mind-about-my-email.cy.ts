// requires-module: account
/**
 * @module
 * AC5 · I changed my mind about my new email. An account that asked to change its address and has
 * not confirmed can ask for the mail again, and only the newest link counts; it can cancel, after
 * which no mailed link confirms anything and the old address still signs in; and an address
 * somebody else holds is refused in plain words.
 *
 * Starts from the `pendingEmail` persona, so the pending state is seeded rather than typed: the
 * notice names the new address before anything is done.
 *
 * Resend is cancel-then-ask-again (JB15). The backend ignores a PATCH carrying the address
 * already parked, so a resend that sent only that mailed nothing.
 */
import { expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';
import type { MailedEmail } from '../../../../scripts/e2e/mail-message';

/** The pending-email notice's text carries the address; this finds it without copying it here. */
const ADDRESS_PATTERN = /\S+@\S+\.[^\s—]+/;

/**
 * Whether a mail carries a confirmation link other than `known` — how the spec tells the second
 * mail from the first when both sit in one inbox.
 *
 * @param known - the link already seen
 */
const carriesAnotherLink =
    (known: string) =>
    (email: MailedEmail): boolean =>
        email.lines?.some(
            (line) => line.startsWith('linkUrl: ') && line !== `linkUrl: ${known}`
        ) === true;

/**
 * Presses "resend" on the pending notice.
 */
const pressResend = (): void => {
    cy.get('[data-test=pending-email-resend]').should('not.be.disabled').click();
};

/**
 * Opens a mailed confirmation link and presses confirm, leaving the page on the answer.
 *
 * @param link - the link as mailed
 */
const confirmFromLink = (link: string): void => {
    cy.visit(link);
    cy.get('[data-test=email-change-submit]').click();
};

describe('AC5 · I changed my mind about my new email', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('resend mails a fresh link and kills the old one, cancel kills them all, and the old address still signs in', () => {
        cy.skipUnlessMailbox();

        cy.step('the profile already names the address that is waiting for proof');
        cy.loginAs('pendingEmail');
        cy.visit('/en/profile');
        cy.get('[data-test=pending-email-notice]')
            .invoke('text')
            .then((text) => {
                const pending = String(ADDRESS_PATTERN.exec(text)?.[0]);
                expect(pending, 'an address in the notice').to.contain('@');
                cy.wrap(pending).as('pending');
            });
        cy.accountOf('pendingEmail').then(({ email }) => cy.wrap(email).as('current'));

        cy.step('resend mails the new address a link, and the old one hears of the request');
        pressResend();
        cy.get<string>('@pending').then((pending) => {
            cy.emailTo(pending).then((email) => {
                expectMailTemplate(email, 'account.verify-request');
                cy.wrap(mailedLinkUrl(email)).as('firstLink');
            });
        });
        cy.get<string>('@current').then((current) => {
            cy.emailTo(current).then((email) => {
                expectMailTemplate(email, 'account.email-change-notice');
            });
        });
        cy.get('[data-test=pending-email-notice]').should('exist');

        cy.step('a second resend replaces the link: the first no longer confirms');
        pressResend();
        cy.get<string>('@pending').then((pending) =>
            cy.get<string>('@firstLink').then((firstLink) => {
                cy.emailTo(pending, carriesAnotherLink(firstLink)).then((email) => {
                    cy.wrap(mailedLinkUrl(email)).as('secondLink');
                });
                confirmFromLink(firstLink);
            })
        );
        cy.get('[data-test=email-change-confirm-error]').should('not.be.empty');

        cy.step('cancel drops the change, and the newest link dies with it');
        cy.visit('/en/profile');
        cy.get('[data-test=pending-email-cancel]').should('not.be.disabled').click();
        cy.get('[data-test=pending-email-notice]').should('not.exist');
        cy.get<string>('@secondLink').then(confirmFromLink);
        cy.get('[data-test=email-change-confirm-error]').should('not.be.empty');

        cy.step('the old address still signs in, and is still the account’s address');
        cy.visit('/en');
        cy.logout();
        cy.loginAs('pendingEmail');
        cy.visit('/en/profile');
        cy.get<string>('@current').then((current) => {
            cy.get('#profile-page [type=email]').should('have.value', current);
        });
        cy.get('[data-test=pending-email-notice]').should('not.exist');

        cy.step('an address somebody else holds is refused in words, and nothing is parked');
        cy.accountOf('editor').then(({ email: taken }) => {
            cy.get('#profile-page [type=email]').should('not.be.disabled').clear();
            cy.get('#profile-page [type=email]').type(taken);
        });
        cy.get('#profile-page form button[type=submit]').first().click();
        cy.get('[data-test=profile-form-error]')
            .should('not.be.empty')
            .and('not.contain.text', 'Conflict');
        cy.get('[data-test=pending-email-notice]').should('not.exist');
    });
});
