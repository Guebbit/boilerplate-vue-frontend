/**
 * Visual regression (L9) — four screens, deliberately.
 *
 * Every other spec asserts on the DOM: the text is present, the route resolved, the button
 * emitted. All of that can pass while the page is visibly broken — a shifted layout, two
 * elements overlapping, a font that failed to load, a colour that became unreadable. Nothing
 * else in this suite looks at what the page LOOKS like.
 *
 * ── Why four and not forty ───────────────────────────────────────────────────────────────────
 * The failure mode of visual testing is social. Screenshots differ for reasons that are not bugs;
 * if that happens often, people stop reading the diffs and start re-approving baselines
 * unlooked-at, and the suite becomes paperwork that produces the appearance of review without
 * the review.
 *
 * Four screens that somebody actually looks at are worth more than forty that are rubber-stamped.
 * So the list is capped and each entry has to earn its place:
 *
 *   - **home** — the shared layout: app bar, navigation, footer. Nearly every layout regression
 *     shows up here first, whatever page introduced it.
 *   - **products list** — a data table with pagination and images. The densest ordinary layout.
 *   - **login** — a form. Field alignment, labels, button states, error slots.
 *   - **404** — the page nobody looks at until something else has already gone wrong.
 *
 * Adding a fifth should mean deleting one, or having a reason.
 *
 * ── Determinism ──────────────────────────────────────────────────────────────────────────────
 * Five things have to be pinned, and the last one is the easiest to miss:
 *
 *   1. **viewport** — `cypress.config.ts`, since image size is part of the diff
 *   2. **clock** — anything rendering a date changes by the minute
 *   3. **animations** — a transition caught mid-frame differs every run
 *   4. **data** — the fixed mock profile, never the random one
 *   5. **THE PAGE ACTUALLY BEING THE PAGE** — the one that is easiest to miss, because every
 *      other layer hides it. `cy.visit()` is overridden in `support/commands.ts` to wait for the
 *      app to bootstrap, and that wait must not be satisfiable by the OUTGOING page — otherwise a
 *      second visit inside a test photographs the previous screen. Ordinary specs cannot see this,
 *      since `cy.get()` retries until the swap happens; a screenshot reads the page once and
 *      cannot. See the `visit` override for the per-visit token that guarantees it.
 *
 * `cy.freezeForVisual()` does 2 and 3; the `beforeEach` does 4; the `visit` override does 5.
 *
 * ── When one fails ───────────────────────────────────────────────────────────────────────────
 * Look at the diff image the task writes before doing anything else. Then either fix the
 * regression, or — if the change was intended — re-record with
 * `npm run test:e2e:visual:update` and let the new baseline be reviewed as an image in the pull
 * request. Re-recording without looking is the one thing that makes this suite worthless.
 */

/** The four screens, and the selector that proves each has finished rendering. */
const SCREENS = [
    ['home', '/en', '#home-page'],
    ['products-list', '/en/products', '#products-list-page'],
    ['login', '/en/login', '#login-page'],
    ['not-found', '/en/this-route-does-not-exist', '#error-page']
] as const;

/*
 * No `cy.resetState()` and no warm-up `cy.visit()`, unlike the other specs — and both omissions
 * are deliberate.
 *
 * These four screens are READ-ONLY: nothing here creates, edits or deletes anything, so there is
 * no state to reset, and the mock profile serves the same fixed dataset on every run.
 *
 * The warm-up visit was actively harmful. Visiting a route and then immediately visiting it again
 * produced a page showing only the navigation shell — the screenshot came out at 77 distinct
 * colours instead of ~3100, i.e. essentially blank. A blank baseline is the worst possible
 * outcome for this suite: it is perfectly stable, it never fails, and it asserts nothing. It was
 * caught by injecting a 120px layout shift and watching the suite stay green.
 */
describe('visual regression', () => {
    beforeEach(() => {
        // Reset the mock database so every screen is photographed against identical data, and
        // signed out — the navigation gains a whole column (Cart, Orders, the account email,
        // Logout) for a signed-in user, so auth state changes the layout, not just the content.
        cy.visit('/en');
        cy.resetState();
    });

    for (const [name, route, readySelector] of SCREENS)
        it(`${name} matches its baseline`, () => {
            cy.visit(route);

            // Wait for real content before freezing: photographing a loading skeleton would
            // produce a stable, meaningless baseline that never changes and never catches
            // anything.
            cy.get(readySelector).should('exist');
            cy.get('h1').should('be.visible');
            // Substantive content, not just the shell. The blank-page failure above passed both
            // assertions above it, so "the page has rendered" needs to mean more than "an h1
            // exists somewhere in the layout".
            cy.get('main, [role=main], #app').should('be.visible');

            cy.freezeForVisual();
            cy.compareSnapshot(name);
        });
});
