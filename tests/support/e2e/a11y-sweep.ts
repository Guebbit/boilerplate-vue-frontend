/// <reference types="cypress" />

/**
 * One axe sweep over a set of routes, at one authentication level.
 *
 * ── Why this exists, and what it replaced ────────────────────────────────────────────────────
 * The accessibility coverage used to be a single central spec holding every route in the app,
 * and that file argued its own case well: the coverage was a list you could read, a failure named
 * the route rather than the feature test it was hiding inside, and adding a route was adding a
 * line.
 *
 * What that shape could not survive is a DELETED MODULE. `rm -rf src/modules/users` left the
 * central list still naming `/en/users` and `/en/users/create`, so the a11y suite failed on routes
 * that no longer existed — an orphan, and exactly the failure co-locating the other e2e specs was
 * meant to end. The routes belong to modules, so their accessibility coverage does too.
 *
 * The original argument is not discarded, it is MOVED: "the coverage is a list you can read"
 * became `tests/cross-cutting/a11y-coverage.spec.ts`, which parses every module's `routes.ts`
 * against its sweep and fails on any route path no sweep visits. A list that is checked beats a
 * list that is merely readable, because nothing stops a reader from not reading it.
 *
 * ── What this file may not know ──────────────────────────────────────────────────────────────
 * It names no domain, and must not. Living under `tests/support/` means being imported by every
 * module's spec, so a route list here would recreate the central coupling this split removed.
 * Callers pass their own routes; this owns only the sweep.
 *
 * ── A page is more than its first paint ──────────────────────────────────────────────────────
 * A route audited once, as it loads, misses everything that only exists after the visitor acts:
 * the drawer on a phone, the language menu, a dialog, a form showing its errors, the dark theme.
 * Those are where hand-written ARIA lives, and so where the defects are. A case may therefore
 * carry a `viewport`, a `theme` and a `prepare` step — all applied AFTER the content wait and
 * BEFORE axe — so the same sweep audits the page in the state the visitor actually reaches.
 *
 * WHAT FAILS A RUN: `serious` and `critical` only — see `cy.checkPageA11y()`. Briefly: a gate that
 * fires on advisory contrast findings is a gate somebody disables, and those two impact levels are
 * the ones that mean "unusable with a keyboard or a screen reader" rather than "could be nicer".
 * Every finding, the lighter ones included, is written to `reports/a11y/` by the same command.
 */

/** One audited state of one route. */
export interface A11ySweepCase {
    /** What a failure reports. */
    name: string;
    /**
     * The path to visit, locale prefix included (`/en/...`), or a function yielding one.
     *
     * The function form is what lets a route carry a record's id without naming one: the id is
     * resolved inside the test, off the backend actually running, rather than baked into a
     * literal at collection time — see `cy.productInRole()`.
     */
    route: A11ySweepRoute;
    /**
     * Puts the page in the state to audit — open a drawer, submit an empty form — after the
     * content has loaded and before axe runs. Plain Cypress commands; they are enqueued in order.
     */
    prepare?: () => void;
    /**
     * Audit under the dark theme, switched on the way the visitor does it: through the app bar's
     * toggle. A sweep that set Vuetify's theme directly would audit a state no click can reach.
     */
    theme?: 'dark';
    /** `[width, height]`, for the layouts a phone gets — the drawer, the stacked forms. */
    viewport?: readonly [width: number, height: number];
}

/** A path, or a way to find one once the backend can be asked. */
export type A11ySweepRoute = string | (() => Cypress.Chainable<string>);

/** The terse spelling for the common case — a route, loaded, audited. */
type A11ySweepEntry = readonly [name: string, route: A11ySweepRoute] | A11ySweepCase;

/** Selector of the app bar's theme toggle — `data-test`, so the `/it/` sweep finds it too. */
const THEME_TOGGLE = '[data-test=theme-toggle]';

const toCase = (entry: A11ySweepEntry): A11ySweepCase =>
    Array.isArray(entry) ? { name: entry[0], route: entry[1] } : (entry as A11ySweepCase);

/** A literal path passes straight through; a lookup is run now, inside the test. */
const resolveRoute = (route: A11ySweepRoute): Cypress.Chainable<string> =>
    typeof route === 'string' ? cy.wrap(route, { log: false }) : route();

/**
 * @param label - what this group of routes is, for the describe title
 * @param routes - `[human name, path]` pairs, or full {@link A11ySweepCase} objects for a state
 *  the visitor has to act to reach
 * @param role - sign in as this first; omitted, the sweep runs as an anonymous visitor
 */
export const sweepA11y = (
    label: string,
    routes: readonly A11ySweepEntry[],
    role?: 'user' | 'admin'
): void => {
    describe(`accessibility — ${label}`, () => {
        beforeEach(() => {
            cy.visit('/en');
            cy.resetState();
            if (role) cy.loginAs(role);
        });

        for (const { name, route, prepare, theme, viewport } of routes.map((entry) =>
            toCase(entry)
        ))
            it(`has no serious or critical violations on ${name}`, () => {
                // Before the visit, so the page lays itself out for that size from the start
                // rather than reflowing under axe. Cypress restores the configured viewport
                // between tests on its own.
                if (viewport) cy.viewport(viewport[0], viewport[1]);
                // Before the visit, so the page's very first fetch is counted — see the command.
                cy.trackNetwork();
                resolveRoute(route).then((path) => {
                    cy.visit(path);
                });
                // Wait for real content rather than the shell, so axe does not audit a loading
                // state and report an empty page as perfect.
                cy.get('h1').should('exist');
                /*
                 * ...and then for the panels BELOW the heading, which fetch their own data after
                 * it renders. A button awaiting a response has its label dimmed by Vuetify's own
                 * loading state, and axe reports that dimming as a contrast failure — correctly,
                 * and about copy nobody is being asked to read yet. `h1` is the shell; this is
                 * the content.
                 *
                 * A data table does the same: `.v-data-table--loading` sets every cell to the
                 * disabled opacity while rows already on screen wait for the rest of their data,
                 * which is a board that fills column by column — not the empty state.
                 *
                 * These two and nothing wider. A bare `.v-progress-circular` also matches the app
                 * shell's own indicator, which is mounted permanently and hidden by CSS, so
                 * waiting on it waits forever.
                 */
                /*
                 * ...and both of those pass trivially BEFORE the first fetch fires, which is the
                 * moment this used to audit. The network count cannot be fooled that way.
                 */
                cy.settleNetwork();
                cy.get('.v-btn--loading').should('not.exist');
                cy.get('.v-data-table--loading').should('not.exist');
                if (theme === 'dark') {
                    cy.get(THEME_TOGGLE).click();
                    // Vuetify stamps the active theme on the app root; colours are only worth
                    // measuring once that has flipped.
                    cy.get('.v-application.v-theme--dark').should('exist');
                }
                prepare?.();
                cy.checkPageA11y(name);
            });
    });
};
