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
 * Resend is its own call (JB15): the backend ignores a PATCH carrying the address already parked,
 * so `POST /account/pending-email/resend` is what mails the link again. It mails the NEW address
 * only, one send a minute; the old address heard of the request once and is not told again. The
 * button counts down the server's own `resendAfter`, and a press that lands inside the cooldown
 * anyway (a reloaded page forgets the countdown) is refused in words and counts down the 429's
 * `retryAfter`.
 */
import { expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';
import { carriesAnotherLink } from '../../../support/e2e/steps';

/** The pending-email notice's text carries the address; this finds it without copying it here. */
const ADDRESS_PATTERN = /\S+@\S+\.[^\s—]+/;

/** The resend's cooldown on the server, plus a second to be safely past it. */
const PAST_THE_COOLDOWN_MS = 61_000;

/** How long a live run waits for the button to count itself down: the cooldown, with a margin. */
const COUNTDOWN_TIMEOUT_MS = 70_000;

/** The subject of the notice the OLD address gets when a change is requested (the `en` copy). */
const NOTICE_SUBJECT = 'Your email address is changing';

/** The pending notice's resend button. */
const RESEND = '[data-test=pending-email-resend]';

/**
 * Lets the resend's cooldown run out. The demo backend's clock is moved and the page reloaded
 * (the browser's countdown does not move with it); a live backend has no movable clock, so the
 * button's own countdown is waited out — which is the countdown being asserted.
 */
const pastTheCooldown = (): void => {
    cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile !== true) {
            cy.travel(PAST_THE_COOLDOWN_MS);
            cy.visit('/en/profile');
            return;
        }
        cy.get(RESEND, { timeout: COUNTDOWN_TIMEOUT_MS }).should('not.be.disabled');
    });
};

/**
 * How many change notices the mailbox holds, whoever they went to.
 */
const noticesSent = (): Cypress.Chainable<number> =>
    cy
        .sentSubjects()
        .then((subjects) => subjects.filter((subject) => subject.includes(NOTICE_SUBJECT)).length);

/**
 * Presses "resend" on the pending notice.
 */
const pressResend = (): void => {
    cy.get(RESEND).should('not.be.disabled').click();
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

        cy.step('resend mails the new address a link, and the old address is not told again');
        noticesSent().as('noticesBefore');
        pressResend();
        cy.get<string>('@pending').then((pending) => {
            cy.emailTo(pending).then((email) => {
                expectMailTemplate(email, 'account.verify-request');
                cy.wrap(mailedLinkUrl(email)).as('firstLink');
            });
        });
        // The link to the new address has arrived, so a notice to the old one would have too.
        cy.get<number>('@noticesBefore').then((before) => {
            noticesSent().should('equal', before);
        });
        cy.get('[data-test=pending-email-notice]').should('exist');

        cy.step('the button counts the server’s cooldown down instead of inviting a second press');
        cy.get(RESEND).should('be.disabled').and('contain.text', 'Resend in');

        cy.step(
            'a press that lands inside the cooldown anyway is refused in words, and counts down'
        );
        // A reloaded page forgets the countdown, which is the first press right after a change.
        cy.visit('/en/profile');
        pressResend();
        cy.get('[data-test=pending-email-error]')
            .should('not.be.empty')
            .and('not.contain.text', 'Too Many');
        cy.get(RESEND).should('be.disabled').and('contain.text', 'Resend in');
        cy.get('[data-test=pending-email-notice]').should('exist');

        cy.step('past the cooldown, resend replaces the link: the first no longer confirms');
        pastTheCooldown();
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
