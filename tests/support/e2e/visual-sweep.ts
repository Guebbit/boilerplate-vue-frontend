/// <reference types="cypress" />

import type { ViewportName } from '../../../scripts/e2e/viewports';
import { applyViewport } from './apply-viewport';
import { resolveRoute, switchToDarkTheme, type SweepRoute } from './sweep-state';

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
 * A case expands to one test per viewport, and the viewport is half of what a baseline means:
 * `<name>.<viewport>[.dark].png`, desktop included. Phone and tablet cases record with touch on
 * (`applyViewport`), because Vuetify ships CSS that exists only under `hover: none`.
 *
 * Even with all five pinned, fonts and antialiasing move pixels between machines. That is why
 * `test:e2e:visual` is its own script and deliberately outside `npm run complete`: a suite that
 * answers to the machine that recorded it is a report, not a gate.
 */

/** One screen to snapshot, at its default first paint or a state a `prepare` step reaches. */
export interface VisualSweepCase {
    /** Becomes the baseline/diff PNG's filename. */
    name: string;
    /**
     * Locale-prefixed path to visit, or a lookup that yields one once the backend can be asked
     * (`/products/:id`, `/orders/:id` through `cy.subjectId()`).
     */
    route: SweepRoute;
    /** Selector `cy.compareSnapshot()` waits to exist before it is safe to photograph. */
    readySelector: string;
    /**
     * Puts the page in the state to photograph — open a dialog, submit a form, drive a whole
     * flow — after the content wait and before the freeze. Plain Cypress commands, enqueued in
     * order. Absent, the screen is photographed at its first paint, same as before this existed.
     */
    prepare?: () => void;
    /**
     * Sizes from the layout matrix, one test (and one baseline) each. Absent, `['desktop']`.
     * A `prepare` that clicks leaves the page where Cypress' `scrollBehavior: 'top'` scrolled it,
     * which is deterministic; a case that wants the top again adds `scrollTo` or `cy.scrollTo`.
     */
    viewports?: readonly ViewportName[];
    /** Photograph under the dark theme, switched the way the visitor does it. */
    theme?: 'dark';
    /**
     * Selector of an element to scroll to just under the app bar after `prepare`: the content
     * below the fold, as a phone shows it after scrolling. Not `fullPage`, which would repeat the
     * fixed bar in every stitched segment.
     */
    scrollTo?: string;
    /**
     * Selectors whose text differs between two runs of an unchanged app — ids minted at boot,
     * dates relative to today, freshly random codes — replaced by one fixed placeholder before the
     * photograph. Replaced rather than hidden: a hidden cell still sizes its column by the text
     * it holds, so the layout would still move with it.
     */
    redact?: readonly string[];
}

/** What a redacted element shows instead — see {@link VisualSweepCase.redact}. */
const REDACTED = 'redacted';

/** The terse spelling for the common case — a route, loaded, photographed. */
type VisualSweepEntry =
    readonly [name: string, route: string, readySelector: string] | VisualSweepCase;

/** The size a case without `viewports` is photographed at. */
const DEFAULT_VIEWPORTS: readonly ViewportName[] = ['desktop'];

/** The baseline's name: one screen's variants sit together, `<name>.<viewport>[.dark]`. */
const snapshotName = (name: string, viewport: ViewportName, theme?: 'dark'): string =>
    `${name}.${viewport}${theme ? '.dark' : ''}`;

/**
 * Retries until every image the viewport shows, or is about to, has finished loading.
 *
 * Images further down are skipped: a lazy one is never fetched until it is near, so waiting on it
 * would wait forever. `complete` is also true for a broken image, so a failed load cannot hang
 * the shot either.
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/complete
 */
const imagesLoaded = (): void => {
    cy.document({ log: false }).should((document_) => {
        const reach = document_.documentElement.clientHeight * 2;
        const pending = [...document_.images].filter(
            (image) => !image.complete && image.getBoundingClientRect().top < reach
        );
        expect(
            pending.map((image) => image.currentSrc),
            'images still loading'
        ).to.deep.equal([]);
    });
};

/**
 * Switches to the dark theme with transitions already killed, then drops the focus the switch
 * left behind.
 *
 * Vuetify fades colours between themes, and a shot taken during the fade has half-dark text; the
 * toggle (or the drawer that holds it) leaves a focus ring on a button that a mouse visitor would
 * not see.
 */
const switchDarkAndSettle = (): void => {
    cy.freezeAnimations();
    switchToDarkTheme();
    cy.document({ log: false }).then((document_) => {
        // `activeElement` is typed `Element`; every focusable one is an HTMLElement, and the
        // `instanceof` check would compare against the spec window's constructor, not the page's.
        (document_.activeElement as HTMLElement | null)?.blur();
    });
};

/**
 * Scrolls an element to just under the fixed app bar, with no animation.
 *
 * @param selector - the element to bring up
 */
const scrollUnderBar = (selector: string): void => {
    cy.get('header')
        .first()
        .invoke('outerHeight')
        .then((barHeight) => {
            // `offset.top` is negative to stop short of the element; duration 0 is no animation,
            // so the freeze that follows sees a settled page.
            // https://docs.cypress.io/api/commands/scrollintoview
            cy.get(selector).scrollIntoView({
                offset: { top: -(barHeight ?? 0), left: 0 },
                duration: 0
            });
        });
};

/**
 * Normalizes either spelling to the object form. `'name' in entry` rather than `Array.isArray`:
 * the tuple is a readonly tuple, which `Array.isArray` refuses to narrow, and the property check
 * discriminates the union with no cast.
 *
 * @param entry - One `screens` element, in either spelling.
 * @returns The object form.
 */
const toCase = (entry: VisualSweepEntry): VisualSweepCase =>
    'name' in entry ? entry : { name: entry[0], route: entry[1], readySelector: entry[2] };

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
            cy.restore();
            if (role) cy.loginAs(role);
        });

        for (const {
            name,
            route,
            readySelector,
            prepare,
            redact,
            viewports,
            theme,
            scrollTo
        } of screens.map((entry) => toCase(entry)))
            for (const viewport of viewports ?? DEFAULT_VIEWPORTS)
                it(
                    `${snapshotName(name, viewport, theme)} matches its baseline`,
                    {
                        // Namespaced: a plain `@phone` in any other spec would make the grep
                        // plugin's static pre-filter drop every visual spec.
                        tags: ['@visual', `@visual-${viewport}`, ...(theme ? ['@visual-dark'] : [])]
                    },
                    () => {
                        // Before any visit of the test, so the page lays out at its size from the
                        // first paint instead of reflowing under the photograph.
                        applyViewport(viewport);

                        // Before the visit, so the page's very first fetch is counted.
                        cy.trackNetwork();
                        resolveRoute(route).then((path) => {
                            cy.visit(path);
                        });

                        // Wait for real content before freezing: photographing a loading skeleton
                        // would produce a stable, meaningless baseline.
                        cy.get(readySelector).should('exist');
                        cy.get('h1').should('be.visible');
                        // Substantive content, not just the shell: the blank-page failure above
                        // passed both assertions before this one.
                        cy.get('main, [role=main], #app').should('be.visible');

                        /*
                         * Every request the page fired has answered. The shell assertions above
                         * pass before any data arrives, and a baseline of a loading screen is
                         * stable, meaningless and never fails.
                         */
                        cy.settleNetwork();

                        // The theme default is 'system': on a dark OS a light case would record
                        // dark pixels with no error, so the light cases say so out loud.
                        if (theme === 'dark') switchDarkAndSettle();
                        else cy.get('.v-application.v-theme--light').should('exist');

                        // Every image loaded: a picture that lands after the scroll below moves
                        // the page under it, and the shot differs from itself between runs.
                        imagesLoaded();

                        prepare?.();
                        if (scrollTo) scrollUnderBar(scrollTo);

                        for (const selector of redact ?? [])
                            cy.get(selector).invoke('text', REDACTED);

                        cy.freezeForVisual();
                        cy.compareSnapshot(snapshotName(name, viewport, theme));
                    }
                );
    });
};
