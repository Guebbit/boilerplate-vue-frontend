/// <reference types="cypress" />

/**
 * @module
 * Reading Umami's own API from a spec: log in, count what the website recorded since a moment, and
 * wait for a fire-and-forget write to become readable. Shared by every spec that asks "how many rows
 * exist" — the question neither repo's own suite can answer, because only a live run has a real
 * Umami with both trackers pointed at it.
 */

/**
 * Umami aggregates events per name over a window; this is one row of that answer.
 */
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
export interface UmamiSession {
    url: string;
    websiteId: string;
    token: string;
}

/**
 * How long Umami is given to make a fire-and-forget write readable.
 */
export const INGEST_TIMEOUT_MS = 20_000;
export const POLL_INTERVAL_MS = 1000;

/**
 * Log in to Umami's own API.
 *
 * The credentials are the compose stack's seeded admin, which exists precisely so the stack comes
 * up ready to query with no manual step — see `umami-init` in the backend's `docker-compose.yml`.
 *
 * @returns The connection later reads are made through.
 */
export const umamiSession = (): Cypress.Chainable<UmamiSession> =>
    cy
        .env(['umamiUrl', 'umamiWebsiteId', 'umamiUser', 'umamiPassword'])
        // Cypress types `cy.env(keys)` as `Chainable<Record<string, any>>` — every key comes
        // back `any` regardless of what the config actually holds — so the callback's own
        // parameter is typed honestly instead of carrying that `any` into the request body.
        .then(({ umamiUrl, umamiWebsiteId, umamiUser, umamiPassword }: Record<string, string>) =>
            cy
                .request<{ token: string }>({
                    method: 'POST',
                    url: `${umamiUrl}/api/auth/login`,
                    body: { username: umamiUser, password: umamiPassword }
                })
                .then(({ body }) => ({
                    url: umamiUrl,
                    websiteId: umamiWebsiteId,
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
export const eventCounts = (
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
 * How many pageviews were recorded since `since` — the app's only unconditional write.
 *
 * A different endpoint from {@link eventCounts} because it is a different kind of fact: Umami's
 * `metrics?type=event` answers for CUSTOM events only, and this app fires none. The pageview is
 * what the tracker script sends by itself on load, so it is the one signal that says "the browser
 * half is alive" without either repo having to emit anything for the test's benefit.
 *
 * @param session - Connection from {@link umamiSession}.
 * @param since - Epoch milliseconds to count from.
 * @returns The pageview count over the window.
 */
export const pageviewCount = (session: UmamiSession, since: number): Cypress.Chainable<number> =>
    cy
        .request<{ pageviews: { value: number } }>({
            method: 'GET',
            url: `${session.url}/api/websites/${session.websiteId}/stats`,
            // Same future-shifted `endAt` as `eventCounts`, for the same clock-skew reason.
            qs: { startAt: since, endAt: Date.now() + 5 * 60 * 1000 },
            headers: { Authorization: `Bearer ${session.token}` }
        })
        .then(({ body }) => body.pageviews.value);

/**
 * Poll `read` until `satisfied` accepts what it yields, or give up at `deadline`.
 *
 * Recursive rather than a fixed wait, because the writes this spec cares about travel by different
 * routes — the browser's tracker and the API's fire-and-forget `fetch` — and a sleep long enough
 * for the slowest one is dead time on every run.
 *
 * Deliberately settles on "at least", never "exactly": waiting for a count to STOP rising cannot
 * be distinguished from a second write that has not landed yet. The exact-count assertion belongs
 * in the test, after this has established the write arrived at all.
 *
 * Callers assert with `.then`, never `.should`. What this yields will never change again, so a
 * retrying assertion on top of it re-checks the same numbers until the command timeout and then
 * blames the timeout — reporting "timed out retrying" for a value that was decided the moment
 * polling stopped. The waiting belongs here; the verdict belongs there.
 *
 * @param read - Reads the current value from Umami.
 * @param satisfied - Whether that value is enough to stop polling.
 * @param deadline - Epoch milliseconds after which to stop polling.
 * @returns The value as of the last poll.
 */
export const pollUntil = <T>(
    read: () => Cypress.Chainable<T>,
    satisfied: (value: T) => boolean,
    deadline: number = Date.now() + INGEST_TIMEOUT_MS
): Cypress.Chainable<T> =>
    read().then((value) => {
        if (satisfied(value) || Date.now() >= deadline) return cy.wrap(value);
        /*
         * The rule this suppresses is about waiting between UI actions, where a fixed sleep hides
         * a missing assertion. This is a poll interval against a THIRD system that neither repo
         * drives — Umami writes when it writes, there is no request to alias and no element to
         * assert on — and it is bounded by `deadline` rather than trusted to be long enough.
         */
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- the debounce under test only flushes after real time passes; see the note above
        return cy
            .wait(POLL_INTERVAL_MS, { log: false })
            .then(() => pollUntil(read, satisfied, deadline));
    });

/** {@link pollUntil} over {@link eventCounts}: wait until `name` reached `expected`. */
export const waitForEvent = (
    session: UmamiSession,
    since: number,
    name: string,
    expected: number
): Cypress.Chainable<Record<string, number>> =>
    pollUntil(
        () => eventCounts(session, since),
        (counts) => (counts[name] ?? 0) >= expected
    );

/** {@link pollUntil} over {@link pageviewCount}: wait until the browser tracker has written. */
export const waitForPageviews = (
    session: UmamiSession,
    since: number,
    expected: number
): Cypress.Chainable<number> =>
    pollUntil(
        () => pageviewCount(session, since),
        (views) => views >= expected
    );

/**
 * Runs `inspect` against Umami on the live profile, and does nothing on the demo one, which has no
 * Umami behind it. For a journey whose UI half runs on both profiles and whose "how many rows"
 * half needs the real thing.
 *
 * @param inspect - the reads to make, given a logged-in Umami connection
 */
export const withUmami = (inspect: (session: UmamiSession) => void): void => {
    cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile === true) umamiSession().then(inspect);
    });
};
