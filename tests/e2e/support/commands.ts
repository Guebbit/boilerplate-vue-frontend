/// <reference types="cypress" />

const RESET_MOCK_MAX_ATTEMPTS = 10;
const RESET_MOCK_RETRY_DELAY_MS = 200;
const APP_READY_TIMEOUT_MS = 15_000;
// A live reset drops and re-seeds the database; measured at ~0.6s locally, with headroom for a
// cold tsx start and a slower CI disk.
const LIVE_RESET_TIMEOUT_MS = 60_000;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Chainable {
            /**
             * Return the backing data to its known seed state, whichever profile is running.
             *
             * - mock profile: POSTs the test-only `/__mock/reset` endpoint, which repopulates
             *   MSW's in-memory database.
             * - live profile: runs the backend's `db:seed:reset:host`, which drops the database,
             *   re-upserts the same fixtures and clears the Redis cache.
             *
             * Both land on the dataset in `db/seeds/index.ts`, which is why the same specs and
             * the same `cy.loginAs()` credentials work against either.
             */
            resetState(): Chainable<void>;

            /**
             * Logs in through the real UI flow using MSW-backed endpoints.
             *
             * @param role - 'user' (default) or 'admin'
             */
            loginAs(role?: 'user' | 'admin'): Chainable<void>;

            /**
             * Skips the current test unless running against the live backend
             * (`npm run test:e2e:live`).
             *
             * Live-only specs (`parity.cy.ts`, the live refresh case in `auth.cy.ts`) open every
             * `it()` with this: under the mock profile there is no live API to compare against or
             * refresh a cookie against, so there is nothing to assert, and the test is reported as
             * skipped rather than faked green.
             */
            skipUnlessLive(): Chainable<void>;
        }
    }
}

// `cy.exec` defaults to `failOnNonZeroExit: true`, so a failed seed already fails the test —
// no extra assertion on the exit code is needed.
const resetLiveDatabase = (backendPath: string) =>
    cy.exec(`npm --prefix ${backendPath} run db:seed:reset:host`, {
        timeout: LIVE_RESET_TIMEOUT_MS
    });

const wait = (milliseconds: number) =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

/**
 * Retries the mock reset until MSW is up, then gives up with the last failure attached.
 *
 * Recursive rather than a loop: a bounded retry is the one shape a promise chain cannot express
 * as a flat sequence, since the number of links is not known up front.
 *
 * The two-argument `.then(onFulfilled, onRejected)` is load-bearing. A trailing `.catch` would
 * also swallow the "gave up" rejection that `attempt` itself produces when `remaining` hits zero,
 * turning the bound into an infinite retry — the failure mode being guarded against here is a
 * worker that never starts, so that would hang the suite instead of failing it.
 */
const resetMswDatabase = () =>
    cy.window().then((windowObject) => {
        const attempt = (remaining: number, lastError?: unknown): Promise<void> => {
            if (remaining === 0)
                return Promise.reject(
                    new Error(
                        `Unable to reset mock state after ${RESET_MOCK_MAX_ATTEMPTS} attempts.${
                            lastError ? ` Last error: ${String(lastError)}` : ''
                        }`
                    )
                );

            return windowObject
                .fetch('/__mock/reset', { method: 'POST' })
                .then(
                    (response) =>
                        response.ok
                            ? undefined
                            : { retryAfter: `Mock reset returned HTTP ${response.status}` },
                    // Ignore transient failures while MSW starts, then retry.
                    (error: unknown) => ({ retryAfter: error })
                )
                .then((outcome) =>
                    outcome
                        ? wait(RESET_MOCK_RETRY_DELAY_MS).then(() =>
                              attempt(remaining - 1, outcome.retryAfter)
                          )
                        : undefined
                );
        };

        return attempt(RESET_MOCK_MAX_ATTEMPTS);
    });

// `allowCypressEnv: false` in cypress.config.ts disables `Cypress.env()`, so the profile flag is
// read through the stateful `cy.env()` API instead.
Cypress.Commands.add('resetState', () =>
    cy
        .env(['apiMockEnabled', 'backendPath'])
        .then(({ apiMockEnabled, backendPath }) =>
            apiMockEnabled === false ? resetLiveDatabase(String(backendPath)) : resetMswDatabase()
        )
);

// After every cy.visit(), wait until the app has fully bootstrapped:
// MSW running + Vue mounted + initial router navigation resolved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Cypress.Commands.overwrite('visit', (originalFunction: any, url: any, options: any) => {
    originalFunction(url, options);
    cy.window({ timeout: APP_READY_TIMEOUT_MS }).should('have.property', '_appReady', true);
});

// A regular `function`, not an arrow, so `this` is Mocha's test context and `this.skip()` works.
Cypress.Commands.add('skipUnlessLive', function skipUnlessLive(this: Mocha.Context) {
    return cy.env(['apiMockEnabled']).then(({ apiMockEnabled }) => {
        if (apiMockEnabled !== false) this.skip();
    });
});

Cypress.Commands.add('loginAs', (role = 'user') => {
    const credentials =
        role === 'admin'
            ? { email: 'root@root.it', password: 'rootroot' }
            : { email: 'gino@pino.it', password: 'password' };

    cy.visit('/en/login');
    cy.get('[type=email]').clear();
    cy.get('[type=email]').type(credentials.email);
    cy.get('[type=password]').clear();
    cy.get('[type=password]').type(credentials.password);
    cy.get('form').submit();
    cy.url().should('not.include', '/login');
});
