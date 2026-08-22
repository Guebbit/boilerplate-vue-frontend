/**
 * Accessibility for the routes that belong to no module — the shell.
 *
 * Every other route's sweep lives with the module that owns it, at
 * `src/modules/<name>/tests/e2e/a11y.cy.ts`, so that deleting a domain deletes its accessibility
 * coverage rather than leaving a central list naming routes the app no longer serves. What stays
 * here is what has no owner to move to: the landing page, the four prose pages, and the error
 * page — reached both the way a visitor reaches it (a bad URL) and by its own address.
 *
 * The shell is also where the chrome every page shares lives — the app bar, the drawer, the
 * language menu, the theme toggle, the account and administration menus — so the states of that
 * chrome are audited here, once, rather than in every module's sweep. The drawer only exists on
 * a phone-sized viewport; the menus, a tooltip and the dark theme only exist after a click or a
 * keystroke; the account and administration menus only exist for someone signed in, which is
 * why those two states run as their own sweeps, under a role.
 *
 * What guarantees the coverage is complete is `tests/cross-cutting/a11y-coverage.spec.ts`, which
 * parses `src/app/router/index.ts` against this file and fails on any route it does not visit.
 *
 * WHAT FAILS A RUN: `serious` and `critical` only. Everything lighter is run, logged and written
 * to `reports/a11y/` — see `cy.checkPageA11y()` for why a gate that fires on advisory contrast
 * findings is a gate somebody disables.
 *
 * Vuetify does most of the heavy lifting (its inputs carry labels and ARIA state), so these sweeps
 * mostly guard OUR markup: a heading level skipped, an icon-only button with no accessible name,
 * an image added without alt text, a colour pair chosen in a hurry.
 *
 * Runs under the demo profile like every other spec in `ci.yml`.
 */
import { sweepA11y } from '../../support/e2e/a11y-sweep';

/** iPhone 14-class portrait: the breakpoint below which the nav collapses into the drawer. */
const PHONE = [390, 844] as const;

sweepA11y('the shell', [
    ['home', '/en'],
    ['about', '/en/about'],
    ['faq', '/en/faq'],
    ['terms', '/en/terms'],
    ['privacy', '/en/privacy'],
    ['404', '/en/this-route-does-not-exist'],
    // The Error route by its own address: `:status` is required, `:message?` is an i18n key
    // the page translates, and the error handler sends real failures here with both.
    ['error page', '/en/error/500/error-page.not-found'],
    // One page in the other shipped locale: the dictionary swap is the only thing that differs,
    // and a translated label that lost its `aria-` counterpart would only show up here.
    ['home (italian)', '/it'],
    {
        name: 'home, dark theme',
        route: '/en',
        theme: 'dark'
    },
    {
        name: 'home, navigation drawer open on a phone',
        route: '/en',
        viewport: PHONE,
        prepare: () => {
            cy.get('[aria-controls=app-drawer]').click();
            cy.get('#app-drawer').should('be.visible');
        }
    },
    {
        name: 'home, language menu open',
        route: '/en',
        prepare: () => {
            // The switcher's accessible name is "Language: EN" — label, colon, current code.
            cy.get('[data-test=language-switcher]').click();
            cy.get('[role=menu] [role=menuitem]').should('be.visible');
        }
    }
]);

/**
 * The bar's entries are icon-only: the label lives in `aria-label` and in a tooltip that opens on
 * focus. Audited with the tooltip showing, because that is when `aria-describedby` points at a
 * node that exists and the two texts can be compared.
 */
const NAV_TOOLTIP_SHOWN = {
    name: 'home, navigation tooltip shown',
    route: '/en',
    prepare: () => {
        // A real Tab: the tooltip opens on `:focus-visible`, which `.focus()` does not set.
        cy.get('.skip-link').focus();
        cy.realPress('Tab');
        cy.realPress('Tab');
        cy.focused().should('match', 'nav a');
        // By Vuetify's active class: tooltip content is `pointer-events: none`, which Cypress
        // reads as "covered", i.e. not visible — axe and a visitor both see it.
        cy.get('.v-tooltip.v-overlay--active .v-overlay__content').should('have.length', 1);
    }
};

sweepA11y('the shell chrome', [NAV_TOOLTIP_SHOWN]);

sweepA11y(
    'the shell chrome, signed in',
    [
        {
            name: 'home, account menu open',
            route: '/en',
            prepare: () => {
                cy.get('[data-test=user-menu]').click();
                cy.get('[role=menu] [role=menuitem]').should('be.visible');
            }
        }
    ],
    'user'
);

sweepA11y(
    'the shell chrome, signed in as an admin',
    [
        {
            name: 'home, administration menu open',
            route: '/en',
            prepare: () => {
                cy.get('[data-test=admin-menu]').click();
                cy.get('[role=menu] [role=menuitem]').should('be.visible');
            }
        },
        {
            name: 'home, navigation drawer open on a phone, every section',
            route: '/en',
            viewport: PHONE,
            prepare: () => {
                cy.get('[aria-controls=app-drawer]').click();
                cy.get('#app-drawer').should('be.visible');
                cy.get('[data-test=drawer-section-admin]').should('be.visible');
            }
        }
    ],
    'admin'
);
