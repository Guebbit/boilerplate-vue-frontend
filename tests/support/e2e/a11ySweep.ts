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
 * became `tests/cross-cutting/a11yCoverage.spec.ts`, which asserts that every module declaring
 * routes also declares an a11y sweep. A list that is checked beats a list that is merely readable,
 * because nothing stops a reader from not reading it.
 *
 * ── What this file may not know ──────────────────────────────────────────────────────────────
 * It names no domain, and must not. Living under `tests/support/` means being imported by every
 * module's spec, so a route list here would recreate the central coupling this split removed.
 * Callers pass their own routes; this owns only the sweep.
 *
 * WHAT FAILS A RUN: `serious` and `critical` only — see `cy.checkPageA11y()`. Briefly: a gate that
 * fires on advisory contrast findings is a gate somebody disables, and those two impact levels are
 * the ones that mean "unusable with a keyboard or a screen reader" rather than "could be nicer".
 *
 * @param label - what this group of routes is, for the describe title
 * @param routes - `[human name, path]` pairs; the name is what a failure reports
 * @param role - sign in as this first; omitted, the sweep runs as an anonymous visitor
 */
export const sweepA11y = (
    label: string,
    routes: readonly (readonly [name: string, route: string])[],
    role?: 'user' | 'admin'
): void => {
    describe(`accessibility — ${label}`, () => {
        beforeEach(() => {
            cy.visit('/en');
            cy.resetState();
            if (role) cy.loginAs(role);
        });

        for (const [name, route] of routes)
            it(`has no serious or critical violations on ${name}`, () => {
                cy.visit(route);
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
                 * `.v-btn--loading` and nothing wider. A bare `.v-progress-circular` also matches
                 * the app shell's own indicator, which is mounted permanently and hidden by CSS,
                 * so waiting on it waits forever.
                 */
                cy.get('.v-btn--loading').should('not.exist');
                cy.checkPageA11y(name);
            });
    });
};
