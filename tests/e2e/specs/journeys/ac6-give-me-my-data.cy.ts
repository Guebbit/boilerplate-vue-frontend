// requires-module: account, orders
/**
 * @module
 * AC6 · Give me my data. The customer asks for the GDPR export from the profile and gets a JSON
 * file: their profile, their address book, their orders and the rest of what the shop holds on
 * them — and nothing that is a secret, or somebody else's.
 *
 * The file is read from disk, and compared with what the API answered, so the proof is about the
 * thing the person actually receives and not only the response behind it.
 */

/** The shapes a secret would take as a key name: none of them may appear anywhere in the export. */
const SECRET_KEY = /password|token|secret|hash/i;

/** A signed token's shape (three base64url parts, the first starting `eyJ`), wherever it sits. */
const SIGNED_TOKEN = /eyJ(?:[\w-]+\.){2}[\w-]+/;

/** What the export answers: the envelope's `data`. */
interface ExportData {
    exportedAt: string;
    profile: { id: string; email: string };
    addresses: unknown[];
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
        cy.step('the customer asks for the export from the profile');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.intercept('POST', '**/account/export').as('export');
        cy.get('[data-test=profile-export-data] button').click();
        cy.wait('@export')
            .its('response.body.data')
            .then((received) => {
                const data = received as ExportData;

                cy.step('a file lands on disk, named for the day, and says what the API said');
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
    });
});
