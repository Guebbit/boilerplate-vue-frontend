/// <reference types="cypress" />

/**
 * @module
 * Getting a page into the state a sweep audits: the route, the size, the theme, the `prepare`
 * step. The a11y sweep, the layout checks, the visual cases and the design capture all start
 * from the same place, so the steps live here once.
 */
import { BREAKPOINTS } from '../../../src/ui/vuetify/breakpoints';
import type { ViewportName } from '../../../scripts/e2e/viewports';
import { applyViewport } from './apply-viewport';

/** A path, or a way to find one once the backend can be asked. */
export type SweepRoute = string | (() => Cypress.Chainable<string>);

/** The state of a page one sweep case reaches. */
export interface SweepState {
    /** The path to visit, locale prefix included, or a function yielding one. */
    route: SweepRoute;
    /** Puts the page in the state to audit; plain Cypress commands, enqueued in order. */
    prepare?: () => void;
    /** Audit under the dark theme, switched the way the visitor does it. */
    theme?: 'dark';
    /** A size from the layout matrix, applied before the visit. */
    viewport?: ViewportName;
}

/** Selector of the theme toggle: `data-test`, so the Italian sweep finds it too. */
const THEME_TOGGLE = '[data-test=theme-toggle]';

/** Selector of the drawer's own theme entry: the bar's toggle is hidden below `sm`. */
const DRAWER_THEME_TOGGLE = '#app-drawer [data-test=drawer-theme-toggle]';

/** Selector of the hamburger that opens the drawer. */
const HAMBURGER = '[aria-controls=app-drawer]';

/** A literal path passes straight through; a lookup is run now, inside the test. */
export const resolveRoute = (route: SweepRoute): Cypress.Chainable<string> =>
    typeof route === 'string' ? cy.wrap(route, { log: false }) : route();

/**
 * Switches to the dark theme the way the visitor does, then waits for Vuetify to say so.
 *
 * Width-aware: below `sm` the app bar drops the toggle and the drawer carries it, so the drawer
 * is opened, used and closed again.
 */
export const switchToDarkTheme = (): void => {
    cy.window({ log: false }).then((win) => {
        if (win.innerWidth < BREAKPOINTS.sm) {
            cy.get(HAMBURGER).click();
            cy.get(DRAWER_THEME_TOGGLE).click();
            cy.get(HAMBURGER).realPress('Escape');
            cy.get('#app-drawer').should('not.be.visible');
        } else {
            cy.get(THEME_TOGGLE).click();
        }
    });
    // Vuetify stamps the active theme on the app root; colours are only worth measuring once
    // that has flipped.
    cy.get('.v-application.v-theme--dark').should('exist');
};

/**
 * Visits the route and waits until the page has real content, then applies the theme and runs
 * `prepare`.
 *
 * The size comes first, before the visit, so the page lays itself out for it from the start
 * rather than reflowing under the audit.
 *
 * @param state - what to reach
 */
export const reachState = ({ route, prepare, theme, viewport }: SweepState): void => {
    if (viewport) applyViewport(viewport);
    // Before the visit, so the page's very first fetch is counted — see the command.
    cy.trackNetwork();
    resolveRoute(route).then((path) => {
        cy.visit(path);
    });
    // Wait for real content rather than the shell, so an audit does not run on a loading state
    // and report an empty page as perfect.
    cy.get('h1').should('exist');
    /*
     * ...and then for the panels BELOW the heading, which fetch their own data after it renders.
     * A button awaiting a response has its label dimmed by Vuetify's own loading state, and axe
     * reports that dimming as a contrast failure — correctly, and about copy nobody is being
     * asked to read yet. `h1` is the shell; this is the content.
     *
     * A data table does the same: `.v-data-table--loading` sets every cell to the disabled
     * opacity while rows already on screen wait for the rest of their data.
     *
     * These two and nothing wider. A bare `.v-progress-circular` also matches the app shell's
     * own indicator, which is mounted permanently and hidden by CSS, so waiting on it waits
     * forever.
     *
     * Both of those pass trivially BEFORE the first fetch fires, so on their own they would
     * audit an empty page. The network count cannot be fooled that way.
     */
    cy.settleNetwork();
    cy.get('.v-btn--loading').should('not.exist');
    cy.get('.v-data-table--loading').should('not.exist');
    if (theme === 'dark') switchToDarkTheme();
    prepare?.();
};
