// requires-module: feedback
/**
 * @module
 * VI3 · A guest writes to the shop. Someone with no account fills the contact form from the Italian
 * site, leaving the name out. The message is acknowledged and the form empties; the shop's operator
 * is mailed in the SHOP's language, not the sender's, because the mail is for the operator. A bot
 * that fills the hidden honeypot field is told "sent" all the same, yet nobody's inbox hears of it.
 * Keep writing and the shop's per-address budget runs out: the sixth message is refused, in words,
 * with what was typed still on the screen.
 *
 * The budget is the backend's own on the live profile. The demo backend raises every budget to
 * 100000, so there the sixth answer is stubbed with the envelope the real limiter sends
 * (`RATE_LIMITED`, the sentence in the guest's own language: Italian here) and the story still proves the form's reaction.
 */
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** The sender's address: one identity, so both the per-address and per-email budgets are spent together. */
const SENDER = 'vi3.guest@example.com';

/** The budget's size: five messages pass, the sixth is refused (`NODE_SUBMISSION_RATE_LIMIT_MAX`). */
const BUDGET = 5;

/** What the real limiter answers with: the shared error envelope and its sentence, in the language the request asked for. */
const TOO_MANY = {
    success: false,
    status: 429,
    message: 'Too Many Requests',
    errors: [{ code: 'RATE_LIMITED', message: 'Troppe richieste. Riprova tra poco.' }]
};

/** One ticket as far as this story reads it. */
interface TicketLike {
    subject: string;
    status: string;
    name?: string;
}

/**
 * Fills the contact form and presses send. The name is left out unless given.
 *
 * @param subject - the ticket's subject, unique to the story
 * @param extra - a hidden honeypot value to type in, when the sender is a bot
 */
const writeToTheShop = (subject: string, extra?: { honeypot: string }): void => {
    cy.get('[data-test=contact-email] input').clear();
    cy.get('[data-test=contact-email] input').type(SENDER);
    cy.get('[data-test=contact-subject] input').clear();
    cy.get('[data-test=contact-subject] input').type(subject);
    cy.textareaIn('contact-message').clear();
    cy.textareaIn('contact-message').type('Do you ship to the islands? Thank you.');
    // A real visitor can never reach this field; a bot's autofill types into it by name.
    if (extra) cy.get('[data-test=contact-website]').type(extra.honeypot, { force: true });
    cy.get('[data-test=contact-submit]').click();
};

/**
 * The tickets the admin's inbox holds for a subject.
 *
 * @param subject - the unique subject
 */
const ticketsAbout = (subject: string): Cypress.Chainable<TicketLike[]> =>
    cy
        .apiAs<{ items: TicketLike[] }>('admin', 'POST', '/feedback/search', { text: subject })
        .then((found) => found?.items ?? []);

describe('VI3 · A guest writes to the shop', () => {
    beforeEach(() => {
        cy.skipUnlessMailbox();
        cy.visit('/en');
        cy.restore();
    });

    it('is acknowledged, the operator is mailed in the shop language, a bot is silently dropped, and the sixth message is refused', () => {
        const run = String(Date.now());
        const first = `VI3 first ${run}`;
        const bot = `VI3 bot ${run}`;
        const third = `VI3 third ${run}`;

        cy.step('a guest writes from the Italian site without a name');
        cy.visit('/it/contact');
        cy.get('#contact-page').should('exist');
        writeToTheShop(first);
        cy.get('[data-test=contact-subject] input').should('have.value', '');
        cy.get('[data-test=contact-email] input').should('have.value', '');
        cy.get('[data-test=contact-submit-error]').should('not.exist');
        ticketsAbout(first).should((tickets) => {
            expect(tickets).to.have.length(1);
            expect(tickets[0].status).to.equal('new');
            expect(tickets[0].name ?? '').to.equal('');
        });

        cy.step("the operator's mail is in the shop's language, whatever language the guest used");
        cy.emailAbout(first).then((mail) => {
            expect(mailMentions(mail, 'New contact request'), 'the shop default, English').to.equal(
                true
            );
            expect(mailMentions(mail, 'Nuova richiesta'), 'not the guest’s Italian').to.equal(
                false
            );
            expect(mailMentions(mail, SENDER), 'who wrote').to.equal(true);
            expect(mailMentions(mail, 'Do you ship to the islands'), 'what they said').to.equal(
                true
            );
        });

        cy.step('a bot that fills the hidden field is told it worked, and nobody is mailed');
        writeToTheShop(bot, { honeypot: 'https://spam.example' });
        cy.get('[data-test=contact-subject] input').should('have.value', '');
        cy.get('[data-test=contact-submit-error]').should('not.exist');
        ticketsAbout(bot).should((tickets) => {
            expect(tickets).to.have.length(1);
            expect(tickets[0].status).to.equal('spam');
        });
        // A later honest message is mailed first in line: once its mail has arrived, the bot's
        // (sent earlier) would have arrived too, so its absence now means it was never sent.
        writeToTheShop(third);
        cy.get('[data-test=contact-subject] input').should('have.value', '');
        cy.emailAbout(third);
        cy.sentSubjects().should((subjects) => {
            expect(subjects.filter((subject) => subject.includes(bot))).to.have.length(0);
        });

        cy.step('keep writing until the budget is spent: the next message is refused, in words');
        for (let sent = 3; sent < BUDGET; sent += 1) {
            writeToTheShop(`VI3 more ${String(sent)} ${run}`);
            // The form empties once the answer arrives; typing before then would be wiped.
            cy.get('[data-test=contact-subject] input').should('have.value', '');
        }
        cy.env(['liveProfile']).then(({ liveProfile }) => {
            // Demo budgets are raised far past this, so the answer a spent budget gives is stubbed.
            if (liveProfile !== true)
                cy.intercept('POST', '**/feedback/contact', { statusCode: 429, body: TOO_MANY });
        });
        const sixth = `VI3 sixth ${run}`;
        writeToTheShop(sixth);
        cy.get('[data-test=contact-submit-error]')
            .should('be.visible')
            .and('contain.text', TOO_MANY.errors[0].message);
        // What the guest typed is still there to send later; nothing was lost.
        cy.get('[data-test=contact-subject] input').should('have.value', sixth);
        ticketsAbout(sixth).should('have.length', 0);
    });
});
