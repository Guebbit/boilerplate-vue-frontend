/**
 * Live profile only. Mechanises the "DATA parity" and "BEHAVIOUR parity" invariants documented
 * at the top of `tests/support/mocks/mockShared.ts`: that file's seed data is hand-mirrored from
 * the backend's `db/seeds/index.ts`, and this is the only thing that catches the two diverging.
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
 * ── ONE CASE PER ROLE ────────────────────────────────────────────────────────────────────────
 * Every collection here answers differently depending on WHO asks, so each collection gets three
 * tests — guest, logged-in non-admin, admin — and each names the role in its title. Two reasons,
 * and the second is the one that earns the extra lines:
 *
 *   - The three answers ARE the authentication rules as seen from outside. A role that starts
 *     answering like another role is an auth regression, and this is where it surfaces.
 *   - A single assertion blending roles cannot say WHICH rule moved. The guest/non-admin pair
 *     matters most precisely because the two are expected to be IDENTICAL: that equality is what
 *     proves logging in grants no extra visibility on its own, and nothing else in the suite
 *     states it.
 *
 * Assertions compare IDS, never lengths. A count that is off by one says only "something moved";
 * an id diff names the record that appeared or vanished, which is the difference between reading
 * a failure and investigating one.
 *
 * Seed values below are the intersection of `tests/support/mocks/mockShared.ts` and the
 * backend's `db/seeds/index.ts` — if a future edit to either changes an id, count, or total,
 * this file must change too, by hand, on purpose. That manual friction is the point: it is what
 * makes a silent drift between the two impossible.
 */

const CREDENTIALS = {
    admin: { email: 'root@root.it', password: 'rootroot' },
    user: { email: 'gino@pino.it', password: 'password' }
};

/** Active and not deleted: what the catalogue shows the world. */
const SEED_PRODUCT_IDS_PUBLIC = [
    '65dc8a99604c307b702b5ccc', // Sallyno Panino
    '65dc9be92f2794d1c16741e1', // Miciona inutile
    '65dcdec2b18ad5e4bd597f0f' // Micino pufettino
];
/** Withheld from everyone but an admin, for two different reasons — hence two entries. */
const SEED_PRODUCT_IDS_HIDDEN = [
    '65dc8ad8604c307b702b5cd4', // Sallyno Carino — soft-deleted
    '6622c88a5123b1e286f440f8' // Bundle micini — inactive
];
const SEED_PRODUCT_IDS_ALL = [...SEED_PRODUCT_IDS_PUBLIC, ...SEED_PRODUCT_IDS_HIDDEN];

const SEED_USER_IDS = [
    '65dd2bdb923652b7800fe180', // root
    '65de646a44f861fd83c13f13' // gino
];

/*
 * Every seeded order, which is what an ADMIN sees: the two root placed, plus gino's — soft-deleted,
 * and therefore visible to admins and to nobody else, not even to gino (`visibleScope()`, mirrored
 * at the top of `mockShared.ts`). Order visibility crosses two independent rules, `userId` scoping
 * and the soft-delete gate, and this is the list that spans both.
 */
const SEED_ORDERS_ADMIN = [
    { id: '65de73a69ca05739be2b5e85', totalItems: 2, totalQuantity: 11, totalPrice: 110 },
    { id: '661c795a9e22bcbef63a5832', totalItems: 1, totalQuantity: 20, totalPrice: 1540 },
    { id: '66b3f0c14d2e8a91c7d4a015', totalItems: 1, totalQuantity: 4, totalPrice: 400 }
];

const apiUrl = (): Cypress.Chainable<string> =>
    cy.env(['apiUrl']).then(({ apiUrl: url }) => url as string);

const login = (baseUrl: string, credentials: { email: string; password: string }) =>
    cy
        .request('POST', `${baseUrl}/account/login`, credentials)
        .then((response) => response.body.data.token as string);

/**
 * GET `path` as one of the three roles. `failOnStatusCode: false` throughout, because a refusal
 * is the expected answer for several of these and the STATUS is what the test asserts on — left
 * at the default, Cypress would fail the test before the assertion could read it.
 */
const getAs = (role: 'guest' | 'user' | 'admin', path: string) =>
    apiUrl().then((baseUrl) =>
        role === 'guest'
            ? cy.request({ url: `${baseUrl}${path}`, failOnStatusCode: false })
            : login(baseUrl, CREDENTIALS[role]).then((token) =>
                  cy.request({
                      url: `${baseUrl}${path}`,
                      headers: { Authorization: `Bearer ${token}` },
                      failOnStatusCode: false
                  })
              )
    );

const idsOf = (response: Cypress.Response<{ data: { items: { id: string }[] } }>): string[] =>
    response.body.data.items.map(({ id }) => id).toSorted();

describe('Mock/seed parity (live profile only)', () => {
    beforeEach(() => {
        cy.skipUnlessLive();
    });

    /*
     * `/products` is the only public collection here: it answers a guest rather than refusing one,
     * so the role split shows up as different CONTENTS instead of different status codes.
     */
    describe('products — what each role may see', () => {
        it('guest sees the active, non-deleted products and nothing else', () => {
            getAs('guest', '/products').then((response) => {
                expect(response.status).to.equal(200);
                expect(idsOf(response)).to.deep.equal(SEED_PRODUCT_IDS_PUBLIC.toSorted());
            });
        });

        it('logged-in non-admin sees exactly what a guest sees — logging in alone reveals nothing', () => {
            getAs('user', '/products').then((response) => {
                expect(response.status).to.equal(200);
                expect(idsOf(response)).to.deep.equal(SEED_PRODUCT_IDS_PUBLIC.toSorted());
            });
        });

        it('admin additionally sees the inactive and the soft-deleted product', () => {
            getAs('admin', '/products').then((response) => {
                expect(response.status).to.equal(200);
                expect(idsOf(response)).to.deep.equal(SEED_PRODUCT_IDS_ALL.toSorted());
                // Named explicitly: the two hidden ids are the whole difference between this role
                // and the other two, so a failure should say which of them went missing.
                expect(idsOf(response)).to.include.members(SEED_PRODUCT_IDS_HIDDEN);
            });
        });
    });

    /*
     * `/orders` is guarded by `isAuth`, so the guest case is a refusal rather than an empty list —
     * a distinction worth pinning, since "no orders" and "not allowed to ask" are the same shape
     * on screen and very different in the API.
     */
    describe('orders — what each role may see', () => {
        it('guest is refused outright, rather than shown an empty list', () => {
            getAs('guest', '/orders').then((response) => {
                expect(response.status).to.equal(401);
            });
        });

        it("logged-in non-admin sees none: root's are scoped away and their own is soft-deleted", () => {
            getAs('user', '/orders').then((response) => {
                expect(response.status).to.equal(200);
                // Zero for two independent reasons at once. gino owns exactly one seeded order and
                // it is soft-deleted, so this also pins that the gate hides a record from its OWN
                // owner — not only from other users.
                expect(idsOf(response)).to.deep.equal([]);
            });
        });

        it('admin sees every seeded order, soft-deleted included, with matching totals', () => {
            getAs('admin', '/orders').then((response) => {
                expect(response.status).to.equal(200);
                const expected = SEED_ORDERS_ADMIN.toSorted((a, b) => a.id.localeCompare(b.id));
                expect(idsOf(response)).to.deep.equal(expected.map(({ id }) => id));

                const items = (response.body.data.items as { id: string }[]).toSorted((a, b) =>
                    a.id.localeCompare(b.id)
                );
                for (const [index, order] of expected.entries())
                    expect(items[index]).to.include(order);
            });
        });
    });

    /*
     * `/users` is admin-only, which makes it the one collection that separates "who are you" from
     * "what may you do": a logged-in non-admin is authenticated and still refused, and 403 rather
     * than 401 is the part worth asserting.
     */
    describe('users — what each role may see', () => {
        it('guest is refused as unauthenticated', () => {
            getAs('guest', '/users').then((response) => {
                expect(response.status).to.equal(401);
            });
        });

        it('logged-in non-admin is forbidden — authenticated, but not entitled', () => {
            getAs('user', '/users').then((response) => {
                expect(response.status).to.equal(403);
            });
        });

        it('admin sees the two seed users mockShared.ts assumes', () => {
            getAs('admin', '/users').then((response) => {
                expect(response.status).to.equal(200);
                expect(idsOf(response)).to.deep.equal(SEED_USER_IDS.toSorted());
            });
        });
    });
});
