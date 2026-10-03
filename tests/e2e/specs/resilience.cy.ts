/**
 * The assertions that hold whatever a FOUNDATION page happens to render — the shell-generic half
 * of what used to be one file (FA122). Every other spec asserts exact counts, titles and prices.
 * Those are the right assertions for a fixed dataset, and they share a blind spot: they only look
 * at the values they name. A page can render a broken image, log a TypeError on every load, or
 * push a 300px-wide table off the viewport, and every one of them stays green.
 *
 * This file does the opposite on purpose. It names no value. It asserts that every route a
 * foundation module serves renders its page and logs nothing unexpected, and that no page scrolls
 * sideways. `cart`, `orders` and `products` carry the SAME two assertions, plus their own
 * dataset-shaped cases (empty lists, pagination, a sparse record) — see their own
 * `tests/e2e/resilience.cy.ts`.
 *
 * ## Why this needs no random data
 *
 * "Does the app survive unusual data" sounds like it needs randomised data, and does not: a
 * console spy and `document.body.scrollWidth` answer the question against ANY dataset, and a
 * generated one would only make a failure unreproducible.
 */

import { assertRouteIsHealthy } from '../../support/e2e/resilience';

describe('Resilience', () => {
    beforeEach(() => {
        // Visit first so every case starts from a rendered app; the reset itself is a plain
        // request to the demo backend and needs no page.
        cy.visit('/en');
        cy.restore();
    });

    /*
     * Cypress already fails a test on an uncaught exception in the application, so not suppressing
     * one covers "nothing threw" for every case below. What these add is the quieter failure: a
     * caught-and-logged error, and a layout that renders but does not fit.
     *
     * The routes are listed rather than discovered from the router. A generated list would cover
     * `products/:id/edit` and `error/:status/:message` too, which need parameters and a fixture to
     * be meaningful — this is the reachable-by-clicking set, and it is short enough to read.
     *
     * FA122: every route below is FOUNDATION — a module every deployment of this boilerplate
     * ships. `cart`, `orders` and `products` carry their own equivalent case in their own
     * `tests/e2e/resilience.cy.ts`, so this file no longer depends on the shop being present.
     * `inventory` and `feedback` are absent deliberately: both belong to a feature still in
     * progress at the time of writing. Add them here when it lands.
     */
    describe('every route renders, quietly, inside the viewport', () => {
        it('public routes: home, a published example', () => {
            assertRouteIsHealthy('/en', '#home-page');
            // Seeded by the backend's demo scenario (`scenarios/examples.ts`, `adminPublished`).
            assertRouteIsHealthy(
                '/en/examples/published/65e1a0000000000000000e04',
                '#example-published-page'
            );
        });

        it('guest-only routes: login, signup', () => {
            assertRouteIsHealthy('/en/login', '#login-page');
            assertRouteIsHealthy('/en/signup', '#signup-page');
        });

        it('authenticated routes: profile, examples', () => {
            cy.loginAs('user');
            assertRouteIsHealthy('/en/profile', '#profile-page');
            assertRouteIsHealthy('/en/examples', '#examples-list-page');
        });

        it('admin-only routes: admin, users', () => {
            cy.loginAs('admin');
            assertRouteIsHealthy('/en/admin', '#admin-page');
            assertRouteIsHealthy('/en/users', '#users-list-page');
        });
    });
});
