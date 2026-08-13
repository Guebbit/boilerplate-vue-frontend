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
        // The name belongs to the library being augmented, not to this codebase: declaration
        // merging only works against the exact interface it declares.
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Chainable {
            /**
             * Return the backing data to its known seed state, whichever profile is running.
             *
             * - mock profile: POSTs the test-only `/__mock/reset` endpoint, which repopulates
             *   MSW's in-memory database.
             * - live profile: runs the backend's `host -- db:seed:reset`, which drops the database,
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
             * Freezes everything that would make a screenshot differ between runs: the clock,
             * animations, the caret, and the dev-server overlay. Call before `compareSnapshot`.
             *
             * @param isoTime - the instant to freeze at; defaults to a fixed date
             */
            freezeForVisual(isoTime?: string): Chainable<void>;

            /**
             * Screenshots the viewport and compares it against the committed baseline in
             * `tests/e2e/snapshots/`. Creates the baseline when there is none.
             *
             * @param name - snapshot name, used for the baseline and diff filenames
             */
            compareSnapshot(name: string): Chainable<void>;

            /**
             * Runs axe against the page as it currently stands.
             *
             * Fails on `serious`/`critical` violations only; everything else is logged. See the
             * implementation for why the line is drawn there.
             *
             * @param context - short label for the log lines, e.g. the route under test
             */
            checkPageA11y(context?: string): Chainable<void>;

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
    cy.exec(`npm --prefix ${backendPath} run host -- db:seed:reset`, {
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

/**
 * After every `cy.visit()`, wait until the app has fully bootstrapped: MSW running, Vue mounted,
 * and the initial router navigation resolved.
 *
 * ── Why `_appReady` alone is not enough ───────────────────────────────────────────────────────
 * `_appReady` is set on `window` by `src/main.ts` once the app has booted, and the outgoing
 * `window` survives right up to the moment the new document commits. So on the SECOND visit
 * inside a test, a wait for `_appReady` can look at the OUTGOING page — which set the flag long
 * ago — see `true`, and resolve before the new page has started loading. Every command that
 * follows then runs against the *previous* screen.
 *
 * ── Why the outgoing window is marked, rather than the incoming one stamped ───────────────────
 * The distinction has to be made on a window we are certain to reach. Marking the INCOMING
 * document means `onBeforeLoad`, which Cypress fires only for the page load it initiates itself:
 * any document arriving another way carries no mark, and an assertion demanding one can then
 * never pass — it burns the full timeout and fails with "expected undefined to equal <token>"
 * even though the app is sitting there perfectly healthy.
 *
 * Marking the OUTGOING window has no such hole. `_supersededByVisit` is set on whatever is
 * currently loaded, immediately before the visit is issued, and the wait then asks only that the
 * window it sees is *not* that one and *is* ready. A fresh document has the property absent,
 * whoever loaded it, so the guard recognises the new page instead of hanging on it.
 *
 * ── Why this is worth guarding so carefully ──────────────────────────────────────────────────
 * A stale window is close to invisible to an ordinary assertion, because `cy.get()` retries: the
 * page swaps underneath it and the assertion passes a beat later. It is fully visible to anything
 * that reads the page ONCE — a screenshot, `cy.document()`, `location.href` — which is why the
 * visual and accessibility specs are the ones that depend on this being right.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Cypress.Commands.overwrite('visit', (originalFunction: any, url: any, options: any) => {
    // Enqueued before the visit below, so it always runs against the page being navigated away
    // from. `log: false` because one of these per visit would double the length of the command log.
    cy.window({ log: false }).then((outgoingWindow) => {
        (outgoingWindow as unknown as Record<string, unknown>)._supersededByVisit = true;
    });

    // Options are passed through untouched — nothing here needs `onBeforeLoad` any more, so a
    // caller's own hook reaches Cypress exactly as they wrote it.
    originalFunction(url, options);

    cy.window({ timeout: APP_READY_TIMEOUT_MS }).should((contentWindow) => {
        const marked = contentWindow as unknown as Record<string, unknown>;
        expect(
            marked._supersededByVisit,
            'the visited page is the current one, not the previous'
        ).to.not.equal(true);
        expect(marked._appReady, 'the app has finished bootstrapping').to.equal(true);
    });
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

/**
 * Accessibility (L9).
 *
 * `cy.checkPageA11y()` injects axe into the page as it currently stands and runs it ONCE.
 *
 * WHAT IT FAILS ON, and why the line is drawn there: `serious` and `critical` only. axe's `minor`
 * and `moderate` findings are largely advisory — a contrast ratio a designer chose, a landmark
 * preference, a heading-order nicety — and gating a merge on them means the gate gets disabled in
 * the first week. `serious`/`critical` are the ones that make a page unusable with a screen reader
 * or a keyboard: an unlabelled control, an image with no alternative text, a form field with no
 * accessible name.
 *
 * Everything else is still RUN and still LOGGED, so the information is on the record and the
 * threshold can be tightened later without rediscovering it. That is why this does not simply
 * pass `includedImpacts` and let cypress-axe assert: that filter drops the lighter findings before
 * the callback ever sees them. One pass, everything reported, the gate applied here.
 *
 * Close to free: the nine existing specs already navigate every route, so an a11y assertion
 * dropped into them costs one axe pass per page rather than a new suite.
 */
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

/**
 * Markup that is on the page but is not the app's.
 *
 * These specs run against `vite dev` (see `test:e2e`), and `vite-plugin-vue-devtools` injects its
 * own floating anchor button into every page. axe audits it like anything else and reports
 * `aria-prohibited-attr` on it — a real finding about the devtools plugin, on all 13 routes, and
 * nothing this codebase can fix or should be blocked by.
 *
 * Excluded rather than allow-listed by rule id: suppressing `aria-prohibited-attr` globally would
 * also suppress it on OUR markup, which is exactly the kind of violation worth catching.
 */
const NOT_OUR_MARKUP = ['#vue-devtools-anchor', '.vue-devtools__anchor-btn'];

/**
 * Blocks until no CSS transition is still running.
 *
 * `color-contrast` is measured from computed colour, so it is only meaningful once colours have
 * stopped moving. Vuetify renders hints and validation messages inside `.v-messages` at
 * `--v-medium-emphasis-opacity` (0.6) and FADES THEM IN — and 0.6 against the surface is already a
 * borderline ratio, so axe sampling part-way through that fade reports a violation on markup that
 * is compliant once settled. It failed intermittently on `product create`, where
 * `FormImageUpload`'s `persistent-hint` means the element is always there; four other pages use the
 * same component.
 *
 * `should` retries, so this is a wait on a CONDITION rather than a guessed duration — the pages
 * with no transitions at all pass it on the first tick.
 *
 * Filtered to `CSSTransition` deliberately: an indefinite keyframe animation (a progress bar, a
 * spinner) never reaches a finished state, so waiting on every `getAnimations()` entry would hang
 * on any page still showing a loader.
 */
const waitForTransitions = () => {
    cy.window().should((win) => {
        const running = win.document
            .getAnimations()
            .filter(
                (animation) =>
                    animation instanceof win.CSSTransition && animation.playState === 'running'
            );

        expect(
            running,
            'CSS transitions still running when axe was about to measure'
        ).to.have.length(0);
    });
};

Cypress.Commands.add('checkPageA11y', (context?: string) => {
    const label = context ? `[a11y ${context}]` : '[a11y]';

    waitForTransitions();
    cy.injectAxe();
    cy.checkA11y(
        { exclude: NOT_OUR_MARKUP.map((selector) => [selector]) },
        undefined,
        (violations) => {
            for (const { id, impact, nodes, help } of violations)
                cy.log(`${label} ${impact}: ${id} — ${help} (${nodes.length} node(s))`);

            const blocking = violations.filter(({ impact }) => BLOCKING_IMPACTS.has(impact ?? ''));
            if (blocking.length > 0)
                throw new Error(
                    `${label} ${blocking.length} serious/critical accessibility violation(s):\n` +
                        blocking
                            .map(
                                ({ id, help, nodes }) =>
                                    `  ${id} — ${help}\n    ${nodes
                                        .map(({ target }) => target.join(' '))
                                        .join('\n    ')}`
                            )
                            .join('\n')
                );
        },
        // Suppress cypress-axe's own assertion: the callback above is the gate, because it is the
        // only place that can log the advisory findings before deciding.
        true
    );
});

/**
 * Visual regression (L9).
 *
 * `cy.compareSnapshot('name')` screenshots the page and compares it, pixel by pixel, against a
 * committed baseline in `tests/e2e/snapshots/`.
 *
 * ── What this catches that nothing else does ─────────────────────────────────────────────────
 * A CSS change that shifts a layout. Two elements overlapping. A web font failing to load. A
 * dark-mode colour becoming unreadable. In every one of those the DOM is correct, the text is
 * present, and every other assertion in this suite passes — only the *appearance* is wrong, and
 * nothing else here looks at appearance.
 *
 * ── Why it is capped at a handful of screens ─────────────────────────────────────────────────
 * Visual tests are the classic flake source, and the failure mode is social rather than
 * technical: screenshots differ for reasons that are not bugs, people stop reading the diffs,
 * baselines get re-approved unlooked-at, and the suite becomes paperwork. Four screens that are
 * genuinely reviewed beat forty that are rubber-stamped.
 *
 * ── The four things that make a screenshot deterministic ─────────────────────────────────────
 * Each of these is a source of pixel noise that has nothing to do with the code:
 *
 *   1. **Fixed viewport** — pinned in `cypress.config.ts`, since image size is part of the diff.
 *   2. **Animations disabled** — a transition caught mid-frame differs every run.
 *   3. **Frozen clock** — anything rendering a date or a relative time changes by the minute.
 *   4. **The fixed mock profile** — never the random one, whose whole purpose is to differ.
 *
 * The first is config; this command does the other three.
 */
Cypress.Commands.add('freezeForVisual', (isoTime = '2026-01-01T12:00:00.000Z') => {
    // A frozen clock, so any rendered date is the same on every run and on every machine.
    cy.clock(new Date(isoTime).getTime(), ['Date']);

    // Kill animation and transition timing. Without this a screenshot can land mid-transition,
    // and the same page differs from itself between runs.
    cy.document().then((document_) => {
        const style = document_.createElement('style');
        style.dataset.testid = 'visual-freeze';
        style.textContent = `
            *, *::before, *::after {
                transition: none !important;
                animation: none !important;
                caret-color: transparent !important;
            }
            /* The dev-server overlay is not part of the app being photographed. */
            #vue-devtools-anchor, .vue-devtools__anchor-btn { display: none !important; }
        `;
        document_.head.append(style);
    });
});

Cypress.Commands.add('compareSnapshot', (name: string) => {
    cy.screenshot(name, { overwrite: true, capture: 'viewport' });

    cy.env(['visualBaselineDirectory', 'visualDiffDirectory', 'updateSnapshots']).then(
        ({ visualBaselineDirectory, visualDiffDirectory, updateSnapshots }) => {
            // Cypress writes screenshots as `<screenshotsFolder>/<spec>/<name>.png`.
            const actualPath = `${Cypress.config('screenshotsFolder')}/${Cypress.spec.relative
                .split('/')
                .pop()}/${name}.png`;

            cy.task('compareVisualSnapshot', {
                name,
                actualPath,
                baselineDirectory: visualBaselineDirectory,
                diffDirectory: visualDiffDirectory,
                update: updateSnapshots === true
            }).then((result) => {
                const { passed, message } = result as { passed: boolean; message: string };
                cy.log(`[visual] ${message}`);
                if (!passed) throw new Error(`[visual] ${message}`);
            });
        }
    );
});
