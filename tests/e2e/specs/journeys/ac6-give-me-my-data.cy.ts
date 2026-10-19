// requires-module: account, orders
/**
 * @module
 * AC6 · Give me my data. The customer asks for the GDPR export from the profile, is told a link is
 * on its way, follows the mailed link and gets a JSON file: their profile, their address book,
 * their orders and the rest of what the shop holds on them — and nothing that is a secret, or
 * somebody else's.
 *
 * The file is read from disk, and compared with what the API sent, so the proof is about the
 * thing the person actually receives and not only the response behind it. Needs the mail outbox
 * for the link.
 *
 * On the demo backend a second story ages the link: a week on, the kept file is swept, the same
 * link answers that the export is gone, and asking again mails a new one.
 */
import { expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';
import type { MailedEmail } from '../../../../scripts/e2e/mail-message';

/** One hour, in milliseconds. */
const HOUR_MS = 60 * 60 * 1000;

/** One day, in milliseconds. */
const DAY_MS = 24 * HOUR_MS;

/** The shapes a secret would take as a key name: none of them may appear anywhere in the export. */
const SECRET_KEY = /password|token|secret|hash/i;

/** A signed token's shape (three base64url parts, the first starting `eyJ`), wherever it sits. */
const SIGNED_TOKEN = /eyJ(?:[\w-]+\.){2}[\w-]+/;

/**
 * The link the export mail carries. The link has no `?token=`, which is what a live inbox's
 * `linkUrl:` line is read from, so there the body's links are searched; the demo outbox records
 * the link as its `linkUrl:` line.
 *
 * @param mail - the export mail `emailTo` returned
 * @returns the URL of the download page
 */
const exportLinkOf = (mail: MailedEmail): string =>
    mail.links?.find((href) => href.includes('/account-export/')) ?? mailedLinkUrl(mail);

/** What the download sends: the export document itself, with no envelope around it. */
interface ExportData {
    exportedAt: string;
    profile: { id: string; email: string };
    sessions: unknown[];
    addresses: unknown[];
    signInMethods: { providers: unknown[]; twoFactor: unknown[] };
    orders: { id: string; userId: string; email: string }[];
}

/**
 * Every key name in a JSON value, at any depth.
 *
 * @param value - a parsed JSON value
 */
const keysOf = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap((item: unknown) => keysOf(item));
    if (typeof value !== 'object' || value === null) return [];
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
};

describe('AC6 · Give me my data', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the export file holds the customer’s own profile, addresses and orders, and no secret or stranger', () => {
        cy.skipUnlessMailbox();
        cy.step('the customer asks for the export from the profile, and is told a link will come');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.intercept('POST', '**/account/export').as('export');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export').its('response.statusCode').should('equal', 202);
        cy.get('[data-test=profile-export-data-requested]').should('be.visible');

        cy.step('the link is mailed, and opening it offers the file');
        cy.intercept('GET', '**/account/export/*').as('download');
        cy.accountOf('user').then(({ email }) => {
            cy.wrap(email).as('email');
            // No template filter: a live mail sink cannot say which template a mail came from, and
            // this inbox holds only the one the request just caused. `expectMailTemplate` checks the
            // template wherever the outbox can name it.
            cy.emailTo(email).then((mail) => {
                expectMailTemplate(mail, 'account.export-ready');
                cy.wrap(exportLinkOf(mail)).as('firstLink');
                cy.visit(exportLinkOf(mail));
            });
        });
        cy.get('[data-test=account-export-download]').click();
        cy.wait('@download')
            .its('response.body')
            .then((received) => {
                const data = received as ExportData;

                cy.step('a file lands on disk, named for the day, and says what the API sent');
                const day = data.exportedAt.slice(0, 10);
                cy.readFile(
                    `${Cypress.config('downloadsFolder')}/account-export-${day}.json`
                ).should('deep.equal', data);

                cy.step('it is about this customer: profile, address book and orders');
                cy.accountOf('user').then(({ email }) => {
                    expect(data.profile.email).to.equal(email);
                    expect(data.addresses, 'the address book').to.have.length.greaterThan(0);
                    expect(data.orders, 'the orders').to.have.length.greaterThan(0);
                    for (const order of data.orders) {
                        expect(order.userId, 'an order’s owner').to.equal(data.profile.id);
                        expect(order.email, 'an order’s email').to.equal(email);
                    }
                });
                cy.subjectId('order.paid').then((paid) => {
                    expect(data.orders.map(({ id }) => id)).to.include(paid);
                });

                cy.step('it lists the sessions, this one included');
                expect(data.sessions, 'the sessions').to.have.length.greaterThan(0);

                cy.step(
                    'it names the ways in the account holds, as facts: linked providers, armed factors'
                );
                expect(data.signInMethods, 'the sign-in methods').to.have.all.keys(
                    'providers',
                    'twoFactor'
                );

                cy.step('it carries no password, token or secret, under any key');
                expect(keysOf(data).filter((key) => SECRET_KEY.test(key))).to.deep.equal([]);
                expect(JSON.stringify(data)).not.to.match(SIGNED_TOKEN);

                cy.step('and nothing that belongs to somebody else');
                cy.subjectId('order.otherPending').then((anotherShoppersOrder) => {
                    expect(data.orders.map(({ id }) => id)).not.to.include(anotherShoppersOrder);
                });
                const everything = JSON.stringify(data);
                for (const role of ['admin', 'editor', 'moderator'] as const) {
                    cy.accountOf(role).then(({ email }) => {
                        expect(everything, `the ${role}’s address`).not.to.contain(email);
                    });
                }
            });

        cy.step('asking again mails a new link, and that file downloads too');
        cy.visit('/en/profile');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export').its('response.statusCode').should('equal', 202);
        cy.get<string>('@email').then((email) => {
            cy.get<string>('@firstLink').then((firstLink) => {
                cy.emailTo(email, (mail) => exportLinkOf(mail) !== firstLink).then((mail) => {
                    cy.visit(exportLinkOf(mail));
                });
            });
        });
        cy.get('[data-test=account-export-download]').click();
        cy.wait('@download').its('response.statusCode').should('equal', 200);
    });

    it('a link older than a week finds its file gone, and a new request mails a new link', () => {
        cy.skipUnlessDemo();
        cy.skipUnlessMailbox();
        cy.step('the customer asks for the export and opens the mailed link once');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.intercept('POST', '**/account/export').as('export');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export').its('response.statusCode').should('equal', 202);
        cy.accountOf('user').then(({ email }) => {
            cy.wrap(email).as('email');
            cy.emailTo(email).then((mail) => {
                cy.wrap(exportLinkOf(mail)).as('firstLink');
            });
        });

        cy.step('a week and an hour pass, and the sweep removes the kept file');
        cy.travel(7 * DAY_MS + HOUR_MS);
        cy.runJob('reap-account-exports').its('job').should('equal', 'reap-account-exports');

        cy.step('signed in again, the old link says the export is gone');
        cy.logout();
        cy.loginAs('user');
        cy.get<string>('@firstLink').then((firstLink) => {
            cy.visit(firstLink);
        });
        cy.get('[data-test=account-export-download]').click();
        cy.get('[data-test=account-export-error]').should('be.visible');
        cy.contains('An export is kept for a few days').should('be.visible');

        cy.step('asking again mails a new link, and that file downloads');
        cy.visit('/en/profile');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export').its('response.statusCode').should('equal', 202);
        cy.intercept('GET', '**/account/export/*').as('download');
        cy.get<string>('@email').then((email) => {
            cy.get<string>('@firstLink').then((firstLink) => {
                cy.emailTo(email, (mail) => exportLinkOf(mail) !== firstLink).then((mail) => {
                    cy.visit(exportLinkOf(mail));
                });
            });
        });
        cy.get('[data-test=account-export-download]').click();
        cy.wait('@download').its('response.statusCode').should('equal', 200);
    });
});
