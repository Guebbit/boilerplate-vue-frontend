/**
 * @module
 * End-to-end authentication flows: login, signup, the route guards that gate `/cart`, `/orders`,
 * `/admin` and `/users`, logout, and a live-only session-refresh case that crosses the app/API
 * origin boundary.
 */
import { seedAccount } from '../../../../../tests/support/e2e/scenario';

describe('Authentication', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('Login', () => {
        beforeEach(() => {
            cy.visit('/en/login');
        });

        it('renders the login form', () => {
            cy.get('#login-page').should('exist');
            cy.get('[type=email]').should('be.visible');
            cy.get('[type=password]').should('be.visible');
            cy.get('button[type="submit"]').should('contain.text', 'Login');
        });

        it('shows a validation error for an invalid email', () => {
            cy.get('[type=email]').should('not.be.disabled').type('not-an-email');
            cy.get('[type=password]').should('not.be.disabled').type('somepassword');
            cy.get('form').submit();
            cy.get('.v-messages__message').should('exist');
        });

        it('shows a validation error when the form is empty', () => {
            cy.get('[type=email]').should('not.be.disabled').clear();
            cy.get('[type=password]').should('not.be.disabled').clear();
            cy.get('form').submit();
            cy.get('.v-messages__message').should('exist');
        });

        it('logs in successfully and redirects to home', () => {
            cy.get('[type=email]').should('not.be.disabled').clear();
            cy.get('[type=email]').should('not.be.disabled').type(seedAccount('admin').email);
            cy.get('[type=password]').should('not.be.disabled').clear();
            cy.get('[type=password]').should('not.be.disabled').type(seedAccount('admin').password);
            cy.get('form').submit();

            cy.url().should('not.include', '/login');
            cy.get('#home-page').should('exist');
        });

        /*
         * The refresh cookie's expiry is the one observable effect of "remember me": unchecked,
         * it is a browser-session cookie (no `expiry` at all); checked, it lasts days. `jwt` rather
         * than the readable `isAuth` twin — Cypress reads httpOnly cookies, a page script could not.
         */
        it('keeps the session only until the browser closes unless asked to remember', () => {
            cy.get('[type=email]').should('not.be.disabled').type(seedAccount('admin').email);
            cy.get('[type=password]').should('not.be.disabled').type(seedAccount('admin').password);
            cy.get('form').submit();
            cy.get('#home-page').should('exist');

            cy.getCookie('jwt').should('exist').and('not.have.property', 'expiry');
        });

        it('remember me keeps the session for days', () => {
            cy.get('[type=email]').should('not.be.disabled').type(seedAccount('admin').email);
            cy.get('[type=password]').should('not.be.disabled').type(seedAccount('admin').password);
            cy.get('[type=checkbox]').check({ force: true });
            cy.get('form').submit();
            cy.get('#home-page').should('exist');

            cy.getCookie('jwt')
                .should('exist')
                .its('expiry')
                .should('be.greaterThan', Date.now() / 1000 + 24 * 60 * 60);
        });
    });

    describe('Signup', () => {
        beforeEach(() => {
            cy.visit('/en/signup');
        });

        it('renders the signup form', () => {
            cy.get('#signup-page').should('exist');
            cy.get('[type=email]').should('be.visible');
        });

        it('shows an error when passwords do not match', () => {
            cy.get('[type=email]').should('not.be.disabled').type('newuser@example.com');
            cy.get('[type=password]').eq(0).should('not.be.disabled').type('NewUser_Pass1!');
            cy.get('[type=password]').eq(1).should('not.be.disabled').type('DifferentPass_456!');
            cy.get('[type=checkbox]').check();
            cy.get('#signup-page button[type="submit"]').click();
            cy.get('.v-messages__message').should('exist');
        });

        it('signs up successfully and lands signed in, unverified', () => {
            cy.get('[type=email]').should('not.be.disabled').type('newuser@example.com');
            cy.get('[type=password]').eq(0).should('not.be.disabled').type('NewUser_Pass1!');
            cy.get('[type=password]').eq(1).should('not.be.disabled').type('NewUser_Pass1!');
            cy.get('[type=checkbox]').check();
            cy.get('#signup-page button[type="submit"]').click();

            // `unverified` is a role, not a waiting room: the session starts here and the banner
            // is what asks for the address, rather than a login form standing in the way.
            cy.url().should('not.include', '/signup');
            cy.url().should('not.include', '/login');
            cy.get('#home-page').should('exist');
            cy.get('[data-test=verify-banner]').should('exist');
        });
    });

    describe('Route guards', () => {
        it('redirects an unauthenticated user from /cart to login', () => {
            cy.clearCookies();
            cy.visit('/en/cart');
            cy.url().should('include', '/login');
        });

        it('redirects an unauthenticated user from /orders to login', () => {
            cy.clearCookies();
            cy.visit('/en/orders');
            cy.url().should('include', '/login');
        });

        it('redirects an authenticated user away from the login page', () => {
            cy.loginAs('user');
            cy.visit('/en/login');
            cy.url().should('not.include', '/login');
        });

        it('redirects an unauthenticated user from admin-only /users to login', () => {
            cy.clearCookies();
            cy.visit('/en/users');
            cy.url().should('include', '/login');
        });

        it('redirects an authenticated non-admin user away from /admin', () => {
            cy.loginAs('user');
            cy.visit('/en/admin');
            cy.url().should('not.include', '/admin');
            cy.get('#home-page').should('exist');
        });

        it('redirects an authenticated non-admin user away from /users', () => {
            cy.loginAs('user');
            cy.visit('/en/users');
            cy.url().should('not.include', '/users');
            cy.get('#home-page').should('exist');
        });

        it('keeps authentication after page reload (F5)', () => {
            cy.loginAs('user');
            cy.visit('/en/cart');
            cy.url().should('not.include', '/login');
            cy.reload();
            cy.url().should('not.include', '/login');
        });
    });

    describe('Logout', () => {
        it('logs out and redirects to home', () => {
            cy.loginAs('user');
            cy.visit('/en/logout');
            cy.url().should('not.include', '/logout');
            cy.get('#home-page').should('exist');
        });

        /**
         * FA123: `cy.switchUser` — logout then login as someone else, in the SAME tab. A page
         * reload (`cy.visit`, `cy.reload`) hands the app iframe a fresh `window`, so a marker
         * planted before the switch surviving it IS the proof there was none — the same
         * technique `resilience.cy.ts` uses to catch console noise across a page's lifetime.
         *
         * Admin-only UI is the identity check: `admin-menu` exists for `admin` and not for
         * `user`, so seeing it disappear is seeing the SECOND account's own session take over,
         * not just "some session, still logged in".
         */
        it('switches from an admin to a different account without reloading the page', () => {
            cy.loginAs('admin');
            cy.get('[data-test=admin-menu]').should('exist');

            cy.window().then((win) => {
                (win as typeof win & { __switchUserMarker?: true }).__switchUserMarker = true;
            });

            cy.switchUser('user');

            cy.window().should((win) => {
                expect(
                    (win as typeof win & { __switchUserMarker?: true }).__switchUserMarker
                ).to.equal(true);
            });
            cy.get('[data-test=admin-menu]').should('not.exist');
            cy.get('[data-test=user-menu]').should('exist');
        });
    });

    // Live profile only: this is the composed stack's cookie path, `withCredentials: true`
    // (src/infrastructure/http/index.ts) sending the refresh cookie from :8085 to :3000 with the
    // real session store behind it. A forced 401 is used instead of reaching into Pinia to clear the
    // in-memory access token: it drives the exact same interceptor path
    // (onResponseRejectWithRefresh -> GET /account/refresh -> retry) through a real network
    // round-trip, without needing a test-only hook into application state.
    describe('Live session refresh (live profile only)', () => {
        it('recovers from a forced 401 by refreshing across the :8085 -> :3000 boundary', () => {
            cy.skipUnlessLive();
            cy.loginAs('admin');
            cy.visit('/en/orders');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);

            let forced401 = false;
            // Pinned to the API origin: a bare glob would also match the app's own `/en/orders`
            // document route. The list reads `POST /orders/search`, never `GET /orders`, so that
            // is the request to fail once.
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.intercept('GET', `${apiUrl}/account/refresh`).as('refresh');
                cy.intercept('POST', `${apiUrl}/orders/search`, (request) => {
                    if (forced401) {
                        request.continue();
                        return;
                    }
                    forced401 = true;
                    request.reply({
                        statusCode: 401,
                        body: {
                            success: false,
                            status: 401,
                            message: 'Unauthorized',
                            errors: [{ code: 'UNAUTHORIZED', message: 'Unauthorized' }]
                        }
                    });
                }).as('ordersSearch');
            });

            cy.reload();

            // The forced 401 must fire, then the retry must reach the API and succeed. Without
            // these waits the test would pass on the ordinary boot refresh alone.
            cy.wait('@ordersSearch').its('response.statusCode').should('eq', 401);
            cy.wait('@ordersSearch').its('response.statusCode').should('eq', 200);
            // Boot refresh + the refresh the 401 triggered.
            cy.get('@refresh.all').should('have.length.at.least', 2);

            // If the refresh cookie hadn't crossed the origin boundary, the retried request would
            // 401 again and the app would bounce to /login instead of re-rendering the list.
            cy.url().should('not.include', '/login');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);
        });
    });
});
