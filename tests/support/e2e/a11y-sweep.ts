/// <reference types="cypress" />

/**
 * One axe sweep over a set of routes, at one authentication level.
 *
 * ── Why a sweep per module, and not one central spec ─────────────────────────────────────────
 * A single central spec listing every route in the app has real appeal: the coverage is a list
 * you can read, a failure names the route rather than the feature test it is hiding inside, and
 * adding a route is adding a line.
 *
 * What that shape cannot survive is a DELETED MODULE. `rm -rf src/modules/users` would leave the
 * central list still naming `/en/users` and `/en/users/create`, failing the a11y suite on routes
 * that do not exist — an orphan, and exactly the failure co-locating the other e2e specs exists
 * to prevent. The routes belong to modules, so their accessibility coverage does too.
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
 *
 * ── Capture mode ─────────────────────────────────────────────────────────────────────────────
 * With `E2E_DESIGN_CAPTURE=true` (`expose.designCapture`) the same cases are photographed instead
 * of audited: no axe, no layout matrix, no touch scan. Which sizes and themes a case becomes is
 * `capture-matrix.ts`; the photographing is `design-capture.ts`; the review that reads the result
 * is `docs/tools/design-review.md`. The flag is read when the spec is collected, because the
 * matrix decides how many `it()`s exist; with it unset, nothing here changes.
 */

import {
    assertCaseOptions,
    sizesFor,
    TEXT_MODE_AT,
    type LayoutCaseOptions
} from '../../../scripts/e2e/layout-findings';
import { VIEWPORTS, type ViewportName } from '../../../scripts/e2e/viewports';
import { BREAKPOINTS } from '../../../src/ui/vuetify/breakpoints';
import {
    DEFAULT_LOCALE,
    expandCaptureCases,
    moduleOfSpec,
    withLocale,
    type PlannedShot
} from '../../../scripts/audit/design-manual/scripts/capture-matrix';
import { applyViewport } from './apply-viewport';
import { waitForTransitions } from './commands';
import type { E2ERole } from '../scenario-description';
import { settleLayout, withTextMode } from './layout-checks';
import { reachState, resolveRoute, type SweepRoute } from './sweep-state';

/** One audited state of one route. */
export interface A11ySweepCase {
    /** What a failure reports. */
    name: string;
    /**
     * The path to visit, locale prefix included (`/en/...`), or a function yielding one.
     *
     * The function form is what lets a route carry a record's id without naming one: the id is
     * resolved inside the test, off the backend actually running, rather than baked into a
     * literal at collection time — see `cy.subjectId()`.
     */
    route: A11ySweepRoute;
    /**
     * Puts the page in the state to audit — open a drawer, submit an empty form — after the
     * content has loaded and before axe runs. Plain Cypress commands; they are enqueued in order.
     */
    prepare?: () => void;
    /**
     * Audit under the dark theme, switched on the way the visitor does it: through the toggle.
     * A sweep that set Vuetify's theme directly would audit a state no click can reach.
     */
    theme?: 'dark';
    /** A size from the layout matrix, for the layouts a phone gets — the drawer, the stacked forms. */
    viewport?: ViewportName;
    /**
     * Narrows the layout matrix for this case, or accepts single elements for single checks.
     * Every reason is checked when the spec is collected (`docs/tools/layout-sweep.md#opting-out`).
     */
    layout?: LayoutCaseOptions;
}

/** A path, or a way to find one once the backend can be asked. */
export type A11ySweepRoute = SweepRoute;

/** The terse spelling for the common case — a route, loaded, audited. */
type A11ySweepEntry = readonly [name: string, route: A11ySweepRoute] | A11ySweepCase;

/** The sizes of the matrix, in the order the sweep walks them after the first. */
const MATRIX_ORDER: readonly ViewportName[] = [
    'desktop',
    'tablet',
    'phone-landscape',
    'phone',
    'phone-small'
];

/** Expands the terse `[name, route]` spelling into a full sweep case. */
const toCase = (entry: A11ySweepEntry): A11ySweepCase => {
    // `Array.isArray` narrows its argument to `any[]` in the standard lib typings — a stdlib
    // quirk, not a real `any` — so the tuple shape is restored by a cast rather than read
    // straight off the narrowed array.
    if (Array.isArray(entry)) {
        const [name, route] = entry as readonly [string, A11ySweepRoute];
        return { name, route };
    }
    return entry as A11ySweepCase;
};

/** Whether this size lays out as a phone, where the focus-zoom and reflow checks apply. */
const isNarrow = (size: ViewportName): boolean => VIEWPORTS[size].width < BREAKPOINTS.sm;

/** The one matrix size the touch scan runs at: the narrowest, where truncation is worst. */
const TOUCH_SCAN_SIZE: ViewportName = 'phone-small';

/**
 * Whether the touch scan runs for this case at this size.
 *
 * The matrix scans once, at {@link TOUCH_SCAN_SIZE}: its four rules do not depend on width, so
 * every touch width would cost four times for no extra catch. A case pinned to a touch size
 * (the drawer cases at `phone`) is scanned there, once, since it never visits the matrix.
 *
 * @param sweepCase - the case being swept
 * @param size - the size the page is laid out at now
 */
const isTouchScanned = (sweepCase: A11ySweepCase, size: ViewportName): boolean =>
    sweepCase.viewport ? VIEWPORTS[size].touch : size === TOUCH_SCAN_SIZE;

/**
 * The layout checks at one size, plus what that size adds: the text treatment it is checked
 * under, axe and the comfort tier at phone widths, and the touch scan (a finger's reach).
 *
 * @param sweepCase - the case being swept
 * @param size - the size the page is laid out at now
 */
const auditAt = (sweepCase: A11ySweepCase, size: ViewportName): void => {
    const { name, layout } = sweepCase;
    const base = { viewport: size, allow: layout?.allow, narrow: isNarrow(size) };
    cy.checkLayout(name, base);

    if (size === 'phone' || size === 'phone-small') cy.checkTargetComfort(`${name} @ ${size}`);
    if (size === 'phone') cy.checkPageA11y(`${name} @ ${size}`);
    if (isTouchScanned(sweepCase, size)) cy.checkTouchReachable(`${name} @ ${size}`);

    const mode = TEXT_MODE_AT[size];
    if (mode)
        withTextMode(mode, () => {
            cy.checkLayout(name, { ...base, mode, checks: ['overflow', 'clipped'] });
        });
};

/**
 * Runs the layout checks at every size the case covers, resizing in place.
 *
 * Each case loads once; a resize lays the app out the same as a fresh load (nothing in `src/`
 * reads the width at mount), and it keeps the state `prepare` built — a reload would lose it.
 *
 * @param sweepCase - the case being swept
 * @param first - the size the page was loaded at
 */
const sweepLayout = (sweepCase: A11ySweepCase, first: ViewportName): void => {
    const sizes = sweepCase.viewport ? [first] : sizesFor(MATRIX_ORDER, sweepCase.layout);
    for (const size of sizes) {
        if (size !== first) {
            applyViewport(size);
            settleLayout();
            waitForTransitions();
        }
        auditAt(sweepCase, size);
    }
};

/**
 * Photographs one planned shot of a case: reaches the state, asserts the theme the shot claims,
 * then hands the page to `cy.captureDesign()`.
 *
 * The theme is asserted because the default is the visitor's stored choice, else the OS's: a shot
 * must never record whatever the host happens to prefer.
 *
 * @param sweepCase - the case being photographed
 * @param shot - the size, theme and locale planned for it
 * @param role - who is signed in, for the manifest
 */
const captureShot = (
    sweepCase: A11ySweepCase,
    shot: PlannedShot,
    role: E2ERole | undefined
): void => {
    reachState({
        route: () => resolveRoute(sweepCase.route).then((path) => withLocale(path, shot.locale)),
        prepare: sweepCase.prepare,
        theme: shot.theme === 'dark' ? 'dark' : undefined,
        viewport: shot.viewport
    });
    cy.get(`.v-application.v-theme--${shot.theme}`).should('exist');
    cy.captureDesign({
        id: shot.id,
        caseName: sweepCase.name,
        viewport: shot.viewport,
        theme: shot.theme,
        locale: shot.locale,
        role: role ?? 'anonymous',
        state: sweepCase.prepare ? 'prepared' : 'first-paint'
    });
};

/**
 * Capture mode: one `it()` per planned shot of every case, instead of one per case.
 *
 * @param label - what this group of routes is, for the describe title
 * @param cases - the group's cases
 * @param role - sign in as this first; omitted, the visitor is anonymous
 */
const captureA11y = (
    label: string,
    cases: readonly A11ySweepCase[],
    role: E2ERole | undefined
): void => {
    // `Cypress.expose` is typed `any`; the config always writes a string, so narrow it to one.
    const exposed: unknown = Cypress.expose('designCaptureLocales');
    const locales =
        typeof exposed === 'string' && exposed !== '' ? exposed.split(',') : [DEFAULT_LOCALE];
    const module = moduleOfSpec(Cypress.spec.relative);
    const expanded = expandCaptureCases(
        cases.map((sweepCase) => ({
            name: sweepCase.name,
            hasPrepare: sweepCase.prepare !== undefined,
            viewport: sweepCase.viewport,
            theme: sweepCase.theme,
            only: sweepCase.layout?.only?.viewports
        })),
        module,
        locales
    );

    describe(`design capture — ${label}`, () => {
        beforeEach(() => {
            cy.visit('/en');
            cy.restore();
            if (role) cy.loginAs(role);
        });

        for (const [index, { shots }] of expanded.entries()) {
            const sweepCase = cases[index];
            if (!sweepCase) continue;
            for (const shot of shots)
                it(`captures ${shot.id}`, () => {
                    captureShot(sweepCase, shot, role);
                });
        }
    });
};

/**
 * @param label - what this group of routes is, for the describe title
 * @param routes - `[human name, path]` pairs, or full {@link A11ySweepCase} objects for a state
 *  the visitor has to act to reach
 * @param role - sign in as this first; omitted, the sweep runs as an anonymous visitor
 */
export const sweepA11y = (
    label: string,
    routes: readonly A11ySweepEntry[],
    role?: E2ERole
): void => {
    // `Cypress.expose` is typed `any`; compare to `true` so only the config's boolean passes.
    if (Cypress.expose('designCapture') === true) {
        captureA11y(
            label,
            routes.map((entry) => toCase(entry)),
            role
        );
        return;
    }

    describe(`accessibility — ${label}`, () => {
        beforeEach(() => {
            cy.visit('/en');
            cy.restore();
            if (role) cy.loginAs(role);
        });

        for (const sweepCase of routes.map((entry) => toCase(entry))) {
            assertCaseOptions(sweepCase.name, sweepCase.layout);
            it(`has no serious or critical violations on ${sweepCase.name}`, () => {
                reachState(sweepCase);
                cy.checkPageA11y(sweepCase.name);
                // The layout matrix is markup, not backend: the demo profile's jwt leg is enough
                // (`docs/tools/layout-sweep.md`), and the other legs keep today's length.
                cy.env(['sessionMode', 'liveProfile']).then(({ sessionMode, liveProfile }) => {
                    if (sessionMode === 'jwt' && liveProfile !== true)
                        sweepLayout(sweepCase, sweepCase.viewport ?? 'desktop');
                });
            });
        }
    });
};
