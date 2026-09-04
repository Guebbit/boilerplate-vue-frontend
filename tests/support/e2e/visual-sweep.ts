/// <reference types="cypress" />

/**
 * One visual-regression sweep over a set of screens, at one authentication level.
 *
 * ── Why a helper, and why baselines are not central ──────────────────────────────────────────
 * `cy.compareSnapshot()` resolves baselines to a `__snapshots__` folder BESIDE THE SPEC, so a
 * module's screens belong to the module and go with it. One flat central folder of PNGs would
 * survive the module's deletion, holding photographs of a screen the app no longer serves — a
 * committed binary nobody will ever look at again, and nothing to tell them.
 *
 * This file names no domain, and must not: living under `tests/support/` means being imported by
 * every module's visual spec, and a screen list here would rebuild the coupling the split removed.
 *
 * ── What has to be frozen, and why this suite is not in the gate ─────────────────────────────
 * A screenshot reads the page once, so anything that varies between runs is a false failure:
 * viewport (pinned in `cypress.config.ts`), clock and animations (`cy.freezeForVisual()`), data
 * (the demo profile serves the same seeded dataset), and auth state — the navigation gains a whole
 * column when signed in, so the ROLE changes the layout and not merely the content.
 *
 * Even with all five pinned, fonts and antialiasing move pixels between machines. That is why
 * `test:e2e:visual` is its own script and deliberately outside `npm run complete`: a suite that
 * answers to the machine that recorded it is a report, not a gate.
 */

/** One screen to snapshot, at its default first paint or a state a `prepare` step reaches. */
export interface VisualSweepCase {
    /** Becomes the baseline/diff PNG's filename. */
    name: string;
    /** Locale-prefixed path to visit. */
    route: string;
    /** Selector `cy.compareSnapshot()` waits to exist before it is safe to photograph. */
    readySelector: string;
    /**
     * Puts the page in the state to photograph — open a dialog, submit a form, drive a whole
     * flow — after the content wait and before the freeze. Plain Cypress commands, enqueued in
     * order. Absent, the screen is photographed at its first paint, same as before this existed.
     */
    prepare?: () => void;
}

/** The terse spelling for the common case — a route, loaded, photographed. */
type VisualSweepEntry =
    readonly [name: string, route: string, readySelector: string] | VisualSweepCase;

const toCase = (entry: VisualSweepEntry): VisualSweepCase =>
    Array.isArray(entry)
        ? { name: entry[0], route: entry[1], readySelector: entry[2] }
        : (entry as VisualSweepCase);

/**
 * @param label - what this group of screens is, for the describe title
 * @param screens - `[snapshot name, path, ready selector]` triples for a screen photographed at
 *  its first paint, or full {@link VisualSweepCase} objects for one a `prepare` step has to reach
 * @param role - sign in as this first; omitted, the sweep runs signed out
 */
export const sweepVisual = (
    label: string,
    screens: readonly VisualSweepEntry[],
    role?: 'user' | 'admin'
): void => {
    describe(`visual regression — ${label}`, () => {
        beforeEach(() => {
            /*
             * No warm-up second visit, and that omission is load-bearing. Visiting a route and
             * then immediately visiting it again produced a page showing only the navigation
             * shell — 77 distinct colours instead of ~3100, i.e. essentially blank. A blank
             * baseline is the worst outcome available here: perfectly stable, never failing, and
             * asserting nothing. It was caught by injecting a 120px layout shift and watching the
             * suite stay green.
             */
            cy.visit('/en');
            cy.resetState();
            if (role) cy.loginAs(role);
        });

        for (const { name, route, readySelector, prepare } of screens.map((entry) => toCase(entry)))
            it(`${name} matches its baseline`, () => {
                // Before the visit, so the page's very first fetch is counted — see the command.
                cy.trackNetwork();
                cy.visit(route);

                // Wait for real content before freezing: photographing a loading skeleton would
                // produce a stable, meaningless baseline.
                cy.get(readySelector).should('exist');
                cy.get('h1').should('be.visible');
                // Substantive content, not just the shell — the blank-page failure above passed
                // both assertions before this one.
                cy.get('main, [role=main], #app').should('be.visible');

                /*
                 * Every request the page fired has answered. The shell assertions above pass
                 * before any data arrives, and a baseline of a loading screen is stable,
                 * meaningless and never fails — the worst outcome this suite can produce.
                 */
                cy.settleNetwork();

                prepare?.();

                cy.freezeForVisual();
                cy.compareSnapshot(name);
            });
    });
};
