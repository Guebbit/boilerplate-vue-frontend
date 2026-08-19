/**
 * The assertions that hold whatever the demo dataset happens to contain.
 *
 * Every other spec asserts exact counts, titles and prices — "four public products", "food (1)",
 * "Sallyno Panino". Those are the right assertions for a fixed dataset, and they share a blind
 * spot: they only look at the values they name. A page can render a broken image, log a TypeError
 * on every load, or push a 300px-wide table off the viewport, and every one of them stays green.
 *
 * This file does the opposite on purpose. It names no value. It asserts that:
 *
 *   - every route a user can reach renders its page and logs nothing unexpected,
 *   - no page scrolls sideways,
 *   - a list with nothing in it renders an empty state rather than breaking,
 *   - the pagination control agrees with the number of rows actually on screen.
 *
 * ## Why this needs no random data
 *
 * It once lived behind a faker-generated mock profile, on the theory that "does the app survive
 * unusual data" needs unusual data. It does not: a console spy and `document.body.scrollWidth`
 * answer the question against ANY dataset, and the demo dataset already carries the awkward
 * records on purpose — one soft-deleted product, one inactive, one whose optional fields are all
 * at their schema defaults (empty description, no categories, no tags). The `barebones` product
 * in the backend's `src/modules/products/demo.ts` is the one that matters here: it is the record a
 * component assuming "every product has a description to truncate" falls over on, and case 6
 * below opens its detail page like any other.
 *
 * What is deliberately NOT asserted: anything about how many of something there is. That belongs
 * in the specs that pin exact values, where a changed count is a signal rather than noise.
 */

/**
 * How much horizontal slack a page gets before it counts as overflowing.
 *
 * One pixel, not zero: sub-pixel layout rounding can leave `scrollWidth` a fraction above
 * `clientWidth` on a page that is visually fine, and a spec that fails on that teaches everyone to
 * ignore it.
 */
const MAX_HORIZONTAL_OVERFLOW_PX = 1;

/** The default page size in `ProductsList.vue`'s `pageSizeOptions`. */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Console output that is known noise rather than a regression, filtered so it cannot mask a real
 * one — and, just as importantly, so a real one is not dismissed as "probably the usual".
 *
 * Keep this list SHORT and keep it justified. Every entry is a thing this spec has stopped
 * watching, so an unexplained addition is how the whole file quietly stops working.
 *
 * - Grafana Faro (`stores/observability.ts`) logs its own `console.error` whenever it cannot reach
 *   its collector. Its logger appends a newline, so `args[0]` is `'Faro\n'`. Fires on every page
 *   load here, because a plain `vite dev` has no Alloy collector beside it.
 * - `[intlify] Not found '<key>' key in '<locale>' locale messages.` — vue-i18n's lazy-loading
 *   order warning, a known rough edge rather than a broken page.
 */
const isKnownConsoleNoise = (call: unknown[]) => {
    const [first] = call;
    if (typeof first !== 'string') return false;
    return first.trim() === 'Faro' || first.startsWith('[intlify] Not found');
};

/*
 * A plain property on `win`, not a `cy.spy(...).as(...)` alias.
 *
 * A spy has to be registered against a window object, and the very first navigation against a cold
 * `vite dev` server can trigger a dependency-discovery reload mid-visit — which discards the window
 * the spy was attached to and silently takes the spy with it. An array reattached synchronously in
 * `onBeforeLoad` has no registration step to lose: worst case on that one cold path it is reset to
 * empty, which cannot produce a false failure.
 */
const CONSOLE_CAPTURE_KEY = '__resilienceConsoleCalls';

interface ConsoleCall {
    type: 'error' | 'warn';
    args: unknown[];
}

type WindowWithConsoleCapture = Cypress.AUTWindow & {
    [CONSOLE_CAPTURE_KEY]?: ConsoleCall[];
};

/** Visit a path with `console.error`/`console.warn` captured for `assertNoConsoleNoise()`. */
const visitCapturingConsole = (path: string) => {
    cy.visit(path, {
        onBeforeLoad(win) {
            const capturedCalls: ConsoleCall[] = [];
            (win as WindowWithConsoleCapture)[CONSOLE_CAPTURE_KEY] = capturedCalls;

            const originalError = win.console.error.bind(win.console);
            win.console.error = (...args: unknown[]) => {
                capturedCalls.push({ type: 'error', args });
                originalError(...args);
            };

            const originalWarn = win.console.warn.bind(win.console);
            win.console.warn = (...args: unknown[]) => {
                capturedCalls.push({ type: 'warn', args });
                originalWarn(...args);
            };
        }
    });
};

const assertNoConsoleNoise = () => {
    cy.window().should((win) => {
        const calls = (win as WindowWithConsoleCapture)[CONSOLE_CAPTURE_KEY] ?? [];
        const unexpected = calls.filter((call) => !isKnownConsoleNoise(call.args));
        expect(
            unexpected,
            `unexpected console calls: ${JSON.stringify(unexpected)}`
        ).to.have.length(0);
    });
};

const assertNoHorizontalOverflow = () => {
    cy.document().then((doc) => {
        expect(
            doc.body.scrollWidth,
            'page scrolls sideways — something is wider than the viewport'
        ).to.be.at.most(doc.documentElement.clientWidth + MAX_HORIZONTAL_OVERFLOW_PX);
    });
};

/** Visit a route, assert its page rendered, and that it was quiet and fit the viewport doing so. */
const assertRouteIsHealthy = (path: string, pageAnchor: string) => {
    visitCapturingConsole(path);
    cy.get(pageAnchor).should('exist');
    assertNoConsoleNoise();
    assertNoHorizontalOverflow();
};

describe('Resilience', () => {
    beforeEach(() => {
        // Visit first so every case starts from a rendered app; the reset itself is a plain
        // request to the demo backend and needs no page.
        cy.visit('/en');
        cy.resetState();
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
     * `inventory` and `feedback` are absent deliberately: both belong to a feature still in
     * progress at the time of writing. Add them here when it lands.
     */
    describe('every route renders, quietly, inside the viewport', () => {
        it('public routes: home, products, playground', () => {
            assertRouteIsHealthy('/en', '#home-page');
            assertRouteIsHealthy('/en/products', '#products-list-page');
            assertRouteIsHealthy('/en/playground', '#playground-page');
        });

        it('guest-only routes: login, signup', () => {
            assertRouteIsHealthy('/en/login', '#login-page');
            assertRouteIsHealthy('/en/signup', '#signup-page');
        });

        it('authenticated routes: cart, orders, profile', () => {
            cy.loginAs('user');
            assertRouteIsHealthy('/en/cart', '#cart-page');
            assertRouteIsHealthy('/en/orders', '#orders-list-page');
            assertRouteIsHealthy('/en/profile', '#profile-page');
        });

        it('admin-only routes: admin, users', () => {
            cy.loginAs('admin');
            assertRouteIsHealthy('/en/admin', '#admin-page');
            assertRouteIsHealthy('/en/users', '#users-list-page');
        });
    });

    describe('the catalogue renders whatever the dataset holds', () => {
        it('renders the public list without console noise or sideways scroll', () => {
            assertRouteIsHealthy('/en/products', '#products-list-page');
            cy.get('[data-test=list-row]').should('have.length.at.least', 1);
        });

        it('opens a detail page for every product an admin can see, including the sparse one', () => {
            cy.loginAs('admin');
            cy.visit('/en/products');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);

            /*
             * Every href collected upfront, then visited directly, rather than returning to the
             * list between products: N page loads instead of 2N. The admin list is the one that
             * matters — it is the only view carrying the inactive and soft-deleted rows, and the
             * `barebones` product with no description, categories or tags.
             */
            cy.get('[data-test=row-view]')
                .then((viewButtons) =>
                    [...viewButtons].map((button) => button.getAttribute('href')!)
                )
                .then((hrefs) => {
                    expect(hrefs.length, 'no product rows to open').to.be.greaterThan(0);

                    for (const href of hrefs) {
                        cy.visit(href);
                        cy.get('#product-target').should('exist');
                        assertNoHorizontalOverflow();
                    }
                });
        });
    });

    describe('lists tolerate being empty', () => {
        it('renders an empty catalogue rather than breaking when a search matches nothing', () => {
            /*
             * An empty list is a state the demo dataset cannot be in by standing still — every
             * seeded collection has rows on purpose — so it is reached the way a user reaches it:
             * by searching for something that is not there. That also makes this the only case
             * here that exercises the list's own empty branch rather than the route's.
             */
            visitCapturingConsole('/en/products');
            cy.get('#products-list-page').should('exist');

            cy.get('[data-test=filter-text]')
                .should('not.be.disabled')
                .type('zzzz-no-such-product-zzzz');
            cy.get('#products-list-page form [type=submit]').click();

            cy.get('[data-test=list-row]').should('not.exist');
            assertNoConsoleNoise();
            assertNoHorizontalOverflow();
        });
    });

    describe('pagination agrees with the rows actually rendered', () => {
        it('shows the pagination control only when the catalogue does not fit on one page', () => {
            cy.loginAs('admin');
            cy.visit('/en/products');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);

            /*
             * Written as the agreement between two things on screen rather than as a fixed
             * expectation, so it keeps meaning something as the demo catalogue grows: a full page
             * means there may be more and the control must be there; a partial page means this is
             * already everything and it must not be. Today the admin list is smaller than one
             * page, so it is the second branch that runs — and it is the branch that would break
             * if a store started reporting a `totalPages` it had not filtered.
             */
            cy.get('[data-test=list-row]').then((rows) => {
                if (rows.length >= DEFAULT_PAGE_SIZE) cy.get('.v-pagination').should('exist');
                else cy.get('.v-pagination').should('not.exist');
            });
        });
    });
});
