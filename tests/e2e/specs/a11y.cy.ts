/**
 * Accessibility (L9) — axe over the routes a user actually reaches.
 *
 * WHY A SPEC OF ITS OWN, rather than an `cy.checkPageA11y()` sprinkled through the other nine.
 * Reusing them is cheaper — they already navigate everywhere — but it spreads one concern across
 * nine files and makes "is the app accessible?" a question you answer by grepping. Here the
 * coverage is a list you can read, a failure names the route rather than the feature test it was
 * hiding inside, and adding a route means adding a line. The extra cost is one page load per
 * route, which is the cheapest thing in this suite.
 *
 * WHAT FAILS A RUN: `serious` and `critical` only. Everything lighter is run and logged. The
 * reasoning is in `cy.checkPageA11y()` — briefly, a gate that fires on advisory contrast findings
 * is a gate somebody disables, and these two impact levels are the ones that mean "unusable with
 * a keyboard or a screen reader" rather than "could be nicer".
 *
 * Vuetify does most of the heavy lifting here (its inputs carry labels and ARIA state), so this
 * mostly guards against OUR markup: a heading level skipped, an icon-only button with no
 * accessible name, an image added without alt text, a colour pair chosen in a hurry.
 *
 * This runs under the mock profile like every other spec in `ci.yml`, so it needs no backend.
 */

/** Public routes: no session required. */
const PUBLIC_ROUTES = [
    ['home', '/en'],
    ['products list', '/en/products'],
    ['login', '/en/login'],
    ['signup', '/en/signup'],
    ['password reset', '/en/password-reset'],
    ['404', '/en/this-route-does-not-exist']
] as const;

/** Routes behind a session, checked as an ordinary user. */
const USER_ROUTES = [
    ['cart', '/en/cart'],
    ['orders list', '/en/orders'],
    ['profile', '/en/profile']
] as const;

/** Routes behind a session, checked as an admin — the densest pages in the app. */
const ADMIN_ROUTES = [
    ['users list', '/en/users'],
    ['user create', '/en/users/create'],
    ['product create', '/en/products/create'],
    ['admin dashboard', '/en/admin']
] as const;

describe('accessibility — public routes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    for (const [name, route] of PUBLIC_ROUTES)
        it(`has no serious or critical violations on ${name}`, () => {
            cy.visit(route);
            // Wait for real content rather than the shell, so axe does not audit a loading state
            // and report an empty page as perfect.
            cy.get('h1').should('exist');
            cy.checkPageA11y(name);
        });
});

describe('accessibility — authenticated routes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    for (const [name, route] of USER_ROUTES)
        it(`has no serious or critical violations on ${name}`, () => {
            cy.loginAs('user');
            cy.visit(route);
            cy.get('h1').should('exist');
            cy.checkPageA11y(name);
        });
});

describe('accessibility — admin routes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    for (const [name, route] of ADMIN_ROUTES)
        it(`has no serious or critical violations on ${name}`, () => {
            cy.loginAs('admin');
            cy.visit(route);
            cy.get('h1').should('exist');
            cy.checkPageA11y(name);
        });
});
