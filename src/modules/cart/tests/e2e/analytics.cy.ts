/**
 * One add-to-cart writes ONE row into Umami — the claim neither repo's own suite can make.
 *
 * ── WHY THIS CANNOT BE A UNIT TEST ───────────────────────────────────────────────────────────
 * Both repos write into one Umami website, and the bug this guards against was invisible from
 * inside either one: the frontend fired `cart_item_added` from its cart store, the backend fired
 * it from `POST /cart/items`, both suites asserted their own emission and both passed. The two
 * rows were indistinguishable — same name, same properties, same website id, and the same visitor
 * hash, because the backend forwards the caller's `User-Agent` and address for attribution. Every
 * count built on those names read twice reality, and nothing anywhere errored.
 *
 * What proves it fixed is not "did this side emit" but "how many rows exist", and only a live run
 * with both trackers pointed at a real Umami can ask that.
 *
 * ── THE CONTROL MATTERS AS MUCH AS THE ASSERTION ─────────────────────────────────────────────
 * A delta of one is the right answer, and it is also what a completely broken backend tracker
 * would produce if the frontend were still emitting — and what a broken FRONTEND tracker produces
 * when the backend is correct. So the spec first proves the browser tracker reaches this Umami, by
 * watching `app_started` move. With the browser half demonstrably live and `cart_item_added` still
 * arriving exactly once, the row can only be the backend's — the frontend has no constant for that
 * name to fire.
 *
 * ── WHY IT SKIPS UNDER THE DEMO PROFILE ──────────────────────────────────────────────────────
 * `npm run test:e2e` runs a real backend, but the demo profile wires no Umami — so the event is
 * emitted into nothing and there is no row to count.
 * `cy.skipUnlessLive()` is the repo's existing answer for that, and using it rather than a local
 * check is what keeps the reason in one place: this spec is live-only for the same reason
 * `cy.resetState()` is, and it should stop running for the same reason too.
 */

/** Umami aggregates events per name over a window; this is one row of that answer. */
interface UmamiEventMetric {
    x: string;
    y: number;
}

/**
 * A logged-in Umami connection: where it is, which website to read, and the bearer token.
 *
 * Carried as a value rather than read from module scope because `allowCypressEnv: false` makes
 * `Cypress.env()` unavailable — settings arrive through the stateful `cy.env()`, which is a
 * command and therefore only readable inside a test.
 */
interface UmamiSession {
    url: string;
    websiteId: string;
    token: string;
}

/** The seeded in-stock product `storefront.cy.ts` also buys. */
const IN_STOCK_PRODUCT_ID = '65dc8a99604c307b702b5ccc';

/** How long Umami is given to make a fire-and-forget write readable. */
const INGEST_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 1000;

/**
 * Log in to Umami's own API.
 *
 * The credentials are the compose stack's seeded admin, which exists precisely so the stack comes
 * up ready to query with no manual step — see `umami-init` in the backend's `docker-compose.yml`.
 *
 * @returns The connection later reads are made through.
 */
const umamiSession = (): Cypress.Chainable<UmamiSession> =>
    cy
        .env(['umamiUrl', 'umamiWebsiteId', 'umamiUser', 'umamiPassword'])
        .then(({ umamiUrl, umamiWebsiteId, umamiUser, umamiPassword }) =>
            cy
                .request<{ token: string }>({
                    method: 'POST',
                    url: `${umamiUrl}/api/auth/login`,
                    body: { username: umamiUser, password: umamiPassword }
                })
                .then(({ body }) => ({
                    url: umamiUrl as string,
                    websiteId: umamiWebsiteId as string,
                    token: body.token
                }))
        );

/**
 * How many times each event name was recorded since `since`.
 *
 * `endAt` is pushed into the future rather than set to now: Umami timestamps a row with the clock
 * of whatever wrote it, and the API container's clock is not this machine's. A window ending
 * exactly now would drop an event written a second in the future by a container that is seconds
 * ahead, which reads as "the fix worked" for the wrong reason.
 *
 * @param session - Connection from {@link umamiSession}.
 * @param since - Epoch milliseconds to count from.
 * @returns A map of event name to occurrence count.
 */
const eventCounts = (
    session: UmamiSession,
    since: number
): Cypress.Chainable<Record<string, number>> =>
    cy
        .request<UmamiEventMetric[]>({
            method: 'GET',
            url: `${session.url}/api/websites/${session.websiteId}/metrics`,
            qs: { type: 'event', startAt: since, endAt: Date.now() + 5 * 60 * 1000 },
            headers: { Authorization: `Bearer ${session.token}` }
        })
        .then(
            ({ body }) =>
                Object.fromEntries(body.map(({ x, y }) => [x, y])) as Record<string, number>
        );

/**
 * Poll until `name` has been recorded `expected` times since `since`, or give up.
 *
 * Recursive rather than a fixed wait, because the two writes this spec cares about travel by
 * different routes — the browser's tracker and the API's fire-and-forget `fetch` — and a sleep
 * long enough for the slower one is dead time on every run.
 *
 * Deliberately settles on "at least", never "exactly": waiting for a count to STOP rising cannot
 * be distinguished from a second write that has not landed yet. The exact-count assertion belongs
 * in the test, after this has established the write arrived at all.
 *
 * Callers assert with `.then`, never `.should`. What this yields is a plain object that will never
 * change again, so a retrying assertion on top of it re-checks the same numbers until the command
 * timeout and then blames the timeout — reporting "timed out retrying" for a value that was
 * decided the moment polling stopped. The waiting belongs here; the verdict belongs there.
 *
 * @param session - Connection from {@link umamiSession}.
 * @param since - Epoch milliseconds to count from.
 * @param name - Event name to wait for.
 * @param expected - Minimum count to wait for.
 * @param deadline - Epoch milliseconds after which to stop polling.
 * @returns The counts as of the last poll.
 */
const waitForEvent = (
    session: UmamiSession,
    since: number,
    name: string,
    expected: number,
    deadline: number = Date.now() + INGEST_TIMEOUT_MS
): Cypress.Chainable<Record<string, number>> =>
    eventCounts(session, since).then((counts) => {
        if ((counts[name] ?? 0) >= expected || Date.now() >= deadline) return cy.wrap(counts);
        /*
         * The rule this suppresses is about waiting between UI actions, where a fixed sleep hides
         * a missing assertion. This is a poll interval against a THIRD system that neither repo
         * drives — Umami writes when it writes, there is no request to alias and no element to
         * assert on — and it is bounded by `deadline` rather than trusted to be long enough.
         */
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- the debounce under test only flushes after real time passes; see the note above
        return cy
            .wait(POLL_INTERVAL_MS, { log: false })
            .then(() => waitForEvent(session, since, name, expected, deadline));
    });

describe('Analytics, end to end', () => {
    // The mock profile has no backend and no Umami, so there is nothing to count.
    beforeEach(() => cy.skipUnlessLive());

    it('records one add-to-cart once, not twice', () => {
        const since = Date.now() - 60 * 1000;

        cy.resetState();

        umamiSession().then((session) => {
            eventCounts(session, since).then((before) => {
                const addedBefore = before.cart_item_added ?? 0;
                const startedBefore = before.app_started ?? 0;

                // Through the UI, not the API: the point is ONE user action, and it is the click
                // that sets both trackers off at once. The product is the seeded in-stock one
                // `storefront.cy.ts` buys, so this walks the same path a person does.
                cy.loginAs('user');
                cy.visit(`/en/products/${IN_STOCK_PRODUCT_ID}`);

                cy.get('[data-test=add-to-cart]').should('be.enabled').click();
                cy.contains('Product added to cart').should('exist');

                // The control: the browser tracker reached this Umami on this visit. Without it a
                // silent frontend and a correct backend look identical to a broken backend and a
                // still-emitting frontend — both report one row.
                waitForEvent(session, since, 'app_started', startedBefore + 1).then((counts) =>
                    expect(
                        counts.app_started ?? 0,
                        'the browser tracker reached Umami — otherwise this spec proves nothing'
                    ).to.be.greaterThan(startedBefore)
                );

                waitForEvent(session, since, 'cart_item_added', addedBefore + 1).should(
                    (counts) => {
                        const delta = (counts.cart_item_added ?? 0) - addedBefore;
                        expect(
                            delta,
                            'one add-to-cart writes one row: 2 is both repos emitting the same name, ' +
                                '0 is the backend tracker not reporting at all'
                        ).to.equal(1);
                    }
                );
            });
        });
    });

    it('writes no server-owned event for a visit that changes nothing', () => {
        // The other half of the split. Loading a page emits the client's own lifecycle names and
        // must emit none of the backend's — a reload is not a checkout. Measured as a DELTA rather
        // than as a count over a window, because whatever the rest of the suite did a minute ago
        // is not this test's business, and asserting on it would make this spec fail for other
        // people's reasons.
        const since = Date.now() - 60 * 1000;

        umamiSession().then((session) => {
            eventCounts(session, since).then((before) => {
                const startedBefore = before.app_started ?? 0;

                cy.visit('/en');

                waitForEvent(session, since, 'app_started', startedBefore + 1).then((counts) => {
                    expect(
                        counts.app_started ?? 0,
                        'the visit emitted app_started, so the tracker was awake for this check'
                    ).to.be.greaterThan(startedBefore);

                    for (const owned of [
                        'checkout_completed',
                        'order_created',
                        'payment_succeeded'
                    ])
                        expect(
                            (counts[owned] ?? 0) - (before[owned] ?? 0),
                            `${owned} is the backend's, and a page load makes no such request`
                        ).to.equal(0);
                });
            });
        });
    });
});
