/**
 * Live profile only. Mechanises the "DATA parity" and "BEHAVIOUR parity" invariants documented
 * at the top of `tests/mocks/shared/mockShared.ts`: that file's seed data is hand-mirrored from
 * the backend's `db/seeds/index.ts`, and nothing previously caught the day the two diverged.
 * Under the mock profile the mirror IS the source of truth, so there is nothing to compare it
 * against — this spec only has meaning against the real, seeded database, which is why every
 * `it()` below opens with `cy.skipUnlessLive()`.
 *
 * Requests go through `cy.request()` rather than `cy.visit()` + UI assertions: `cy.request()`
 * always hits the real network (it runs in Node, not the page), so it reaches the live API even
 * when other specs in the same run are exercising MSW in the browser. That is also exactly why
 * this spec cannot run meaningfully under the mock profile — there would be nothing listening
 * on the real `apiUrl` unless a live backend happens to be up anyway.
 *
 * Seed values below are the intersection of `tests/mocks/shared/mockShared.ts` and the
 * backend's `db/seeds/index.ts` — if a future edit to either changes an id, count, or total,
 * this file must change too, by hand, on purpose. That manual friction is the point: it is what
 * makes a silent drift between the two impossible.
 */

const ADMIN_CREDENTIALS = { email: 'root@root.it', password: 'rootroot' };
const USER_CREDENTIALS = { email: 'gino@pino.it', password: 'password' };

const SEED_PRODUCT_IDS_PUBLIC = [
    '65dc8a99604c307b702b5ccc', // Sallyno Panino
    '65dc9be92f2794d1c16741e1', // Miciona inutile
    '65dcdec2b18ad5e4bd597f0f' // Micino pufettino
];
const SEED_PRODUCT_IDS_HIDDEN = [
    '65dc8ad8604c307b702b5cd4', // Sallyno Carino — soft-deleted
    '6622c88a5123b1e286f440f8' // Bundle micini — inactive
];
const SEED_PRODUCT_IDS_ALL = [...SEED_PRODUCT_IDS_PUBLIC, ...SEED_PRODUCT_IDS_HIDDEN];

const SEED_USER_IDS = [
    '65dd2bdb923652b7800fe180', // root
    '65de646a44f861fd83c13f13' // gino
];

// Both seeded orders were placed by root — the userId-scoping split this spec exercises.
const SEED_ORDERS_ADMIN = [
    { id: '65de73a69ca05739be2b5e85', totalItems: 2, totalQuantity: 11, totalPrice: 110 },
    { id: '661c795a9e22bcbef63a5832', totalItems: 1, totalQuantity: 20, totalPrice: 1540 }
];

const apiUrl = (): Cypress.Chainable<string> =>
    cy.env(['apiUrl']).then(({ apiUrl: url }) => url as string);

const login = (baseUrl: string, credentials: { email: string; password: string }) =>
    cy
        .request('POST', `${baseUrl}/account/login`, credentials)
        .then((response) => response.body.data.token as string);

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Mock/seed parity (live profile only)', () => {
    beforeEach(() => {
        cy.skipUnlessLive();
    });

    it('data parity: anonymous product visibility matches the seed split', () => {
        apiUrl().then((baseUrl) => {
            cy.request(`${baseUrl}/products`).then((response) => {
                const ids = response.body.data.items
                    .map((item: { id: string }) => item.id)
                    .toSorted();
                expect(ids).to.deep.equal(SEED_PRODUCT_IDS_PUBLIC.toSorted());
            });
        });
    });

    it('behaviour parity: admin sees every seeded product, including hidden ones', () => {
        apiUrl().then((baseUrl) => {
            login(baseUrl, ADMIN_CREDENTIALS).then((token) => {
                cy.request({ url: `${baseUrl}/products`, headers: authHeaders(token) }).then(
                    (response) => {
                        const ids = response.body.data.items
                            .map((item: { id: string }) => item.id)
                            .toSorted();
                        expect(ids).to.deep.equal(SEED_PRODUCT_IDS_ALL.toSorted());
                    }
                );
            });
        });
    });

    it('data parity: the two seed users exist with the ids mockShared.ts assumes', () => {
        apiUrl().then((baseUrl) => {
            login(baseUrl, ADMIN_CREDENTIALS).then((token) => {
                cy.request({ url: `${baseUrl}/users`, headers: authHeaders(token) }).then(
                    (response) => {
                        const ids = response.body.data.items
                            .map((item: { id: string }) => item.id)
                            .toSorted();
                        expect(ids).to.deep.equal(SEED_USER_IDS.toSorted());
                    }
                );
            });
        });
    });

    it('behaviour parity: order scoping — admin sees both seeded orders with matching totals', () => {
        apiUrl().then((baseUrl) => {
            login(baseUrl, ADMIN_CREDENTIALS).then((token) => {
                cy.request({ url: `${baseUrl}/orders`, headers: authHeaders(token) }).then(
                    (response) => {
                        const items = (response.body.data.items as { id: string }[]).toSorted(
                            (a, b) => a.id.localeCompare(b.id)
                        );
                        const expected = SEED_ORDERS_ADMIN.toSorted((a, b) =>
                            a.id.localeCompare(b.id)
                        );
                        expect(items).to.have.length(expected.length);
                        for (const [index, order] of expected.entries()) {
                            expect(items[index]).to.include(order);
                        }
                    }
                );
            });
        });
    });

    it("behaviour parity: order scoping — a non-admin sees none of root's orders", () => {
        apiUrl().then((baseUrl) => {
            login(baseUrl, USER_CREDENTIALS).then((token) => {
                cy.request({ url: `${baseUrl}/orders`, headers: authHeaders(token) }).then(
                    (response) => {
                        expect(response.body.data.items).to.have.length(0);
                    }
                );
            });
        });
    });
});
