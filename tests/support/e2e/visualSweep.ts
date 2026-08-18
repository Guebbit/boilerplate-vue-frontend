/// <reference types="cypress" />

/**
 * One visual-regression sweep over a set of screens, at one authentication level.
 *
 * ── Why a helper, and why baselines are not central ──────────────────────────────────────────
 * The screens used to be one central list with one flat `tests/e2e/snapshots/` folder of PNGs.
 * That works until a module is deleted, at which point the folder is left holding photographs of
 * a screen the app no longer serves — a committed binary nobody will ever look at again, and
 * nothing to tell them. `cy.compareSnapshot()` therefore resolves baselines to a `__snapshots__`
 * folder BESIDE THE SPEC, so a module's screens belong to the module and go with it.
 *
 * This file names no domain, and must not: living under `tests/support/` means being imported by
 * every module's visual spec, and a screen list here would rebuild the coupling the split removed.
 *
 * ── What has to be frozen, and why this suite is not in the gate ─────────────────────────────
 * A screenshot reads the page once, so anything that varies between runs is a false failure:
 * viewport (pinned in `cypress.config.ts`), clock and animations (`cy.freezeForVisual()`), data
 * (the mock profile serves the same demo dataset), and auth state — the navigation gains a whole
 * column when signed in, so the ROLE changes the layout and not merely the content.
 *
 * Even with all five pinned, fonts and antialiasing move pixels between machines. That is why
 * `test:e2e:visual` is its own script and deliberately outside `npm run complete`: a suite that
 * answers to the machine that recorded it is a report, not a gate.
 *
 * @param label - what this group of screens is, for the describe title
 * @param screens - `[snapshot name, path, ready selector]`; the name becomes the PNG filename
 * @param role - sign in as this first; omitted, the sweep runs signed out
 */
export const sweepVisual = (
    label: string,
    screens: readonly (readonly [name: string, route: string, readySelector: string])[],
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

        for (const [name, route, readySelector] of screens)
            it(`${name} matches its baseline`, () => {
                cy.visit(route);

                // Wait for real content before freezing: photographing a loading skeleton would
                // produce a stable, meaningless baseline.
                cy.get(readySelector).should('exist');
                cy.get('h1').should('be.visible');
                // Substantive content, not just the shell — the blank-page failure above passed
                // both assertions before this one.
                cy.get('main, [role=main], #app').should('be.visible');

                cy.freezeForVisual();
                cy.compareSnapshot(name);
            });
    });
};
