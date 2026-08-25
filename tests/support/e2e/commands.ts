/// <reference types="cypress" />

import { E2E_ACCOUNTS } from './accounts';

/*
 * A demo reset drops the in-memory database and reseeds it inside the backend process
 * (`POST /__demo/reset`, see the backend's `src/app/demo.ts`) — measured in tens of
 * milliseconds, budgeted generously for a CI box under load.
 */
const DEMO_RESET_TIMEOUT_MS = 30_000;
const APP_READY_TIMEOUT_MS = 15_000;
// A live reset drops and re-seeds the database; measured at ~0.6s locally, with headroom for a
// cold tsx start and a slower CI disk.
const LIVE_RESET_TIMEOUT_MS = 60_000;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        // The name belongs to the library being augmented, not to this codebase: declaration
        // merging only works against the exact interface it declares.
        interface Chainable {
            /**
             * Return the backing data to its known seed state, whichever profile is running.
             *
             * - demo profile (default): POSTs the backend's `/__demo/reset`, which drops the
             *   in-memory database and reseeds it from the modules' demo fixtures, in-process.
             * - live profile: runs the backend's own seed-reset command, which drops the real
             *   database, re-seeds the same fixtures and clears the cache.
             *
             * Both land on the dataset in the backend's `db/demo/index.ts`, which is why the same
             * specs and the same `cy.loginAs()` credentials work against either.
             */
            resetState(): Chainable<void>;

            /**
             * Logs in through the real UI flow against the profile's backend.
             *
             * @param role - 'user' (default) or 'admin'
             */
            loginAs(role?: 'user' | 'admin'): Chainable<void>;

            /**
             * Starts counting API requests, so `settleNetwork()` can tell when the page has
             * finished loading. Call BEFORE `cy.visit()`: an intercept registered after the
             * navigation misses the requests the page fires on mount.
             */
            trackNetwork(): Chainable<void>;

            /**
             * Waits until no API request tracked by `trackNetwork()` is in flight, and stays so
             * for two consecutive polls. The answer to "has the page finished loading" that needs
             * no per-screen knowledge — the shell renders before any data arrives, so asserting
             * on the shell alone audits or photographs a loading state.
             */
            settleNetwork(): Chainable<void>;

            /**
             * Freezes everything that would make a screenshot differ between runs: the clock,
             * animations, the caret, and the dev-server overlay. Call before `compareSnapshot`.
             *
             * @param isoTime - the instant to freeze at; defaults to a fixed date
             */
            freezeForVisual(isoTime?: string): Chainable<void>;

            /**
             * Screenshots the viewport and compares it against the committed baseline in the
             * `__snapshots__` folder beside the spec. Creates the baseline when there is none.
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
             * Live-only cases open every `it()` with this: the full stack (real Redis, real
             * broker) is the live profile's whole point, and against the demo profile there is
             * nothing to assert, so the test is reported as skipped rather than faked green.
             */
            skipUnlessLive(): Chainable<void>;

            /**
             * Skips the current test unless running against the demo profile.
             *
             * The inverse of `skipUnlessLive`, for the flows that hinge on the demo outbox
             * (`/__demo/emails`): against the live backend the emails leave through a real queue
             * a browser cannot read, so there is nothing to assert.
             */
            skipUnlessDemo(): Chainable<void>;

            /**
             * The newest email the demo backend "sent" to an address, from the `/__demo/emails`
             * outbox. Fails the test when there is none — an empty inbox is an answer too.
             *
             * @param address - the recipient to look for
             */
            demoEmailTo(address: string): Chainable<DemoOutboxEmail>;

            /**
             * Follows a main-navigation entry from the desktop bar, by the path it links to.
             *
             * The bar is icon-only, so a label is the wrong handle: it is a tooltip and an
             * `aria-label`, translated. The `href` is what the entry IS, in every locale.
             *
             * @param path - locale-prefixed path, e.g. `/en/products`
             */
            navigateTo(path: string): Chainable<void>;

            /**
             * Follows an entry folded into one of the app bar's menus — the signed-in visitor's
             * account menu or the administration menu — by the path it links to.
             *
             * @param menu - which menu holds the entry
             * @param path - locale-prefixed path, e.g. `/en/cart`
             */
            navigateViaMenu(menu: 'account' | 'admin', path: string): Chainable<void>;

            /** Ends the session through the account menu, as a visitor would. */
            logout(): Chainable<void>;
        }
    }
}

/** Mirrors `DemoOutboxEmail` in the backend's `src/infrastructure/adapters/demo-outbox.ts`. */
export interface DemoOutboxEmail {
    to: string;
    subject: string;
    template: string;
    token?: string;
    lines?: string[];
}

// `cy.exec` defaults to `failOnNonZeroExit: true`, so a failed seed already fails the test —
// no extra assertion on the exit code is needed.
const resetLiveDatabase = (command: string) =>
    cy.exec(command, {
        timeout: LIVE_RESET_TIMEOUT_MS
    });

/*
 * `__E2E_API_URL` is how one built bundle serves many backends: each shard owns its own demo API
 * (see scripts/run-e2e-shards.ts), and the app's axios client reads this override before falling back
 * to the baked VITE_API_URL. Injected from `window:before:load` rather than a `cy.visit`
 * overwrite, because the hook fires for EVERY page load — `cy.reload()` and app-initiated
 * navigations included — while an overwrite covers only the visits Cypress itself issues. The
 * sessions specs found that hole: their `cy.reload()` booted the app pointed at a backend a
 * different shard owned.
 *
 * The value is captured in a `before` hook because `allowCypressEnv: false` makes the env
 * readable only through the stateful `cy.env()` command, which cannot run inside an event
 * handler.
 */
let injectedApiUrl: string | undefined;
before(() => {
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        injectedApiUrl = String(apiUrl);
    });
});
Cypress.on('window:before:load', (contentWindow) => {
    if (injectedApiUrl !== undefined)
        (contentWindow as Cypress.AUTWindow & { __E2E_API_URL?: string }).__E2E_API_URL =
            injectedApiUrl;
});

// `allowCypressEnv: false` in cypress.config.ts disables `Cypress.env()`, so the profile flag is
// read through the stateful `cy.env()` API instead.
Cypress.Commands.add('resetState', () =>
    cy
        .env(['liveProfile', 'liveResetCommand', 'apiUrl'])
        .then(({ liveProfile, liveResetCommand, apiUrl }) =>
            liveProfile === true
                ? resetLiveDatabase(String(liveResetCommand))
                : // The demo backend resets itself in-process; a plain request is all it takes,
                  // and a non-2xx already fails the test.
                  cy.request({
                      method: 'POST',
                      url: `${String(apiUrl)}/__demo/reset`,
                      timeout: DEMO_RESET_TIMEOUT_MS
                  })
        )
);

/**
 * After every `cy.visit()`, wait until the app has fully bootstrapped: Vue mounted and the
 * initial router navigation resolved.
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cypress.Commands.overwrite's own signature is any-typed; these forward verbatim
Cypress.Commands.overwrite('visit', (originalFunction: any, url: any, options: any) => {
    // Enqueued before the visit below, so it always runs against the page being navigated away
    // from. `log: false` because one of these per visit would double the length of the command log.
    cy.window({ log: false }).then((outgoingWindow) => {
        (
            outgoingWindow as Cypress.AUTWindow & { _supersededByVisit?: boolean }
        )._supersededByVisit = true;
    });

    // Options are passed through untouched — the `__E2E_API_URL` injection lives in the
    // `window:before:load` hook below, so a caller's own `onBeforeLoad` reaches Cypress
    // exactly as they wrote it.
    originalFunction(url, options);

    cy.window({ timeout: APP_READY_TIMEOUT_MS }).should((contentWindow) => {
        const marked = contentWindow as Cypress.AUTWindow & { _supersededByVisit?: boolean };
        expect(
            marked._supersededByVisit,
            'the visited page is the current one, not the previous'
        ).to.not.equal(true);
        expect(marked._appReady, 'the app has finished bootstrapping').to.equal(true);
    });
});

/*
 * ── WHY EVERY `.type()` AND `.clear()` IN THE SPECS IS PRECEDED BY `.should('not.be.disabled')` ──
 *
 * `cy.get()` retries until an element EXISTS. `.type()` and `.clear()` do not retry: they run the
 * moment the selector resolves, and both fail outright against a disabled field rather than waiting
 * for it. A form rendered in its loading state is therefore a valid `cy.get()` target and an invalid
 * one to type into — so the spec fails with "targeted a disabled element" on a slow machine and
 * passes on a fast one.
 *
 * `.should()` DOES retry, so asserting the field is enabled converts that race into a wait. This is
 * Cypress' documented "assert, then act": Playwright waits for actionability on its own, Cypress
 * checks visibility and occlusion but treats `disabled` as an immediate error, so the wait has to be
 * written down.
 *
 * `cy.visit` is overwritten below to wait for `_appReady`, which covers BOOTSTRAP — Vue mounted,
 * `router.isReady()` resolved (`src/main.ts`). It cannot cover a view's own async state, so
 * a field can still be disabled after the app is ready. That gap is what these assertions close.
 *
 * Applied to every call rather than only where a failure was seen, so that no reader has to work out
 * why one line is guarded and its neighbour is not — and so the next spec is written by copying one
 * that already is. Overwriting `type` globally to do this is NOT an option: `cy.clear()` is
 * implemented by invoking `type`, so a Cypress command called from inside that overwrite errors with
 * "you returned a promise from a command while also invoking one or more cy commands".
 */

// A regular `function`, not an arrow, so `this` is Mocha's test context and `this.skip()` works.
Cypress.Commands.add('skipUnlessLive', function skipUnlessLive(this: Mocha.Context) {
    return cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile !== true) this.skip();
    });
});

// Same shape as `skipUnlessLive`, inverted; same reason for the regular `function`.
Cypress.Commands.add('skipUnlessDemo', function skipUnlessDemo(this: Mocha.Context) {
    return cy.env(['liveProfile']).then(({ liveProfile }) => {
        if (liveProfile === true) this.skip();
    });
});

// A plain request: the outbox lives in the demo backend's process, not in the page.
Cypress.Commands.add('demoEmailTo', (address: string) =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) => cy.request(`${String(apiUrl)}/__demo/emails`))
        .then((response) => {
            const { emails } = response.body as { emails: DemoOutboxEmail[] };
            const email = emails.find(({ to }) => to === address);
            expect(email, `an email to ${address} in the demo outbox`).to.not.equal(undefined);
            return email!;
        })
);

/**
 * Navigation through the chrome, by `href` rather than by label — see the declarations above.
 *
 * The drawer holds the same links, hidden at desktop widths, so the visible one is the target.
 */
Cypress.Commands.add('navigateTo', (path: string) => {
    cy.get(`header nav a[href="${path}"]`).filter(':visible').first().click();
});

const MENU_ACTIVATOR = { account: '[data-test=user-menu]', admin: '[data-test=admin-menu]' };

Cypress.Commands.add('navigateViaMenu', (menu: 'account' | 'admin', path: string) => {
    cy.get(MENU_ACTIVATOR[menu]).click();
    cy.get(`[role=menu] a[href="${path}"]`).should('be.visible').click();
});

Cypress.Commands.add('logout', () => {
    cy.get(MENU_ACTIVATOR.account).click();
    cy.get('[role=menu] [data-test=logout]').should('be.visible').click();
});

Cypress.Commands.add('loginAs', (role = 'user') => {
    const credentials = E2E_ACCOUNTS[role];

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
 * The rule set, pinned by tag rather than left to axe's default.
 *
 * axe's default runs "everything except experimental", and what "everything" means moves with
 * every axe-core release — so an `npm update` could add a rule and fail a page that had not
 * changed, or drop one and pass a page that had regressed. Naming the tags makes the contract
 * explicit: WCAG 2.0/2.1/2.2 at A and AA, plus axe's own best practices (the landmark and
 * heading-order rules, most of which land as `moderate` and so inform rather than gate).
 */
const AXE_RULE_TAGS = [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice'
] as const;

/** Where every finding lands, blocking or not — see `a11y-task.ts`. */
const A11Y_REPORT_TASK = 'recordA11yViolations';

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
        undefined,
        { runOnly: { type: 'tag', values: [...AXE_RULE_TAGS] } },
        (violations) => {
            for (const { id, impact, nodes, help } of violations)
                cy.log(`${label} ${impact}: ${id} — ${help} (${nodes.length} node(s))`);

            /*
             * Everything to disk, the advisory findings included: the Cypress log above is gone
             * the moment the run ends, and the JSON is what CI uploads. Recorded BEFORE the gate
             * below throws, so a failing page's full picture is in the report too.
             */
            cy.url({ log: false }).then((url) => {
                cy.task(
                    A11Y_REPORT_TASK,
                    {
                        spec: Cypress.spec.relative,
                        context: context ?? url,
                        url,
                        violations: violations.map(
                            ({ id, impact, help, helpUrl, tags, nodes }) => ({
                                id,
                                impact,
                                help,
                                helpUrl,
                                tags,
                                nodes: nodes.map(({ target, html }) => ({
                                    target: target.map(String),
                                    html
                                }))
                            })
                        )
                    },
                    { log: false }
                );
            });

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
 * committed baseline in the `__snapshots__` folder beside the spec.
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
 *   4. **The demo profile** — the same seeded dataset on every run.
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
            /*
             * The corner activity indicator (LayoutDefault.vue) is chrome, not the page. The
             * sweep waits for it, but some screens never clear it — so without this a baseline
             * would record whether a request happened to be in flight, which is a property of
             * the network rather than of the screen.
             */
            [data-test='activity-indicator'] { display: none !important; }
        `;
        document_.head.append(style);
    });
});

/*
 * ── Network settling ─────────────────────────────────────────────────────────────────────────
 * Counted in the spec's own closure rather than read off the page. The corner activity indicator
 * is the app's own answer, but it is ALSO invisible before the first request fires — so a check
 * that ran early enough saw a quiet page and declared it loaded. An intercept registered before
 * the visit cannot be early: it sees every request the page fires from its first tick.
 */
let inFlight = 0;

/** How long one settle poll waits, how many polls it may take, and how many quiet polls count. */
const SETTLE_POLL_MS = 100;
const SETTLE_MAX_POLLS = 100;
const SETTLE_QUIET_POLLS = 2;

Cypress.Commands.add('trackNetwork', () => {
    inFlight = 0;
    // `allowCypressEnv: false` in cypress.config.ts — the stateful API, as every other command.
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        cy.intercept({ url: `${String(apiUrl)}/**`, middleware: true }, (request) => {
            inFlight += 1;
            request.on('after:response', () => {
                inFlight -= 1;
            });
        });
    });
});

const settle = (pollsLeft: number, quietPolls: number): void => {
    if (quietPolls >= SETTLE_QUIET_POLLS) return;
    if (pollsLeft <= 0)
        throw new Error(
            `settleNetwork: ${inFlight} request(s) still in flight after ${SETTLE_MAX_POLLS * SETTLE_POLL_MS}ms`
        );
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- the pause is what makes the loop a poll rather than a spin; the condition is re-checked each time
    cy.wait(SETTLE_POLL_MS).then(() => settle(pollsLeft - 1, inFlight === 0 ? quietPolls + 1 : 0));
};

Cypress.Commands.add('settleNetwork', () => {
    settle(SETTLE_MAX_POLLS, 0);
});

Cypress.Commands.add('compareSnapshot', (name: string) => {
    cy.screenshot(name, { overwrite: true, capture: 'viewport' });

    cy.env(['visualDiffDirectory', 'updateSnapshots']).then(
        ({ visualDiffDirectory, updateSnapshots }) => {
            /*
             * Cypress writes screenshots as `<screenshotsFolder>/<spec relative path>/<name>.png`
             * — the WHOLE path, not the file name. Take only the basename and the read fails with
             * an ENOENT naming a directory Cypress never wrote to.
             */
            const actualPath = `${Cypress.config('screenshotsFolder')}/${
                Cypress.spec.relative
            }/${name}.png`;

            /*
             * The baseline directory is derived from the SPEC, not configured centrally: a spec at
             * `src/modules/products/tests/e2e/*.visual.cy.ts` keeps its baselines in a
             * `__snapshots__` folder beside it. That is what makes `rm -rf src/modules/products`
             * take its baselines with it — a central folder would be left holding PNGs of a screen
             * that no longer exists, and nothing would ever notice.
             *
             * Diffs go the other way, to one central `reports/` folder: they are throwaway output
             * of a failed run, they are gitignored, and CI uploads them from one place.
             */
            cy.task('compareVisualSnapshot', {
                name,
                actualPath,
                specRelative: Cypress.spec.relative,
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
