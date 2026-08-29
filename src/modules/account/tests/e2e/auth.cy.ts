describe('Authentication', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
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
            cy.get('[type=email]').should('not.be.disabled').type('root@root.it');
            cy.get('[type=password]').should('not.be.disabled').clear();
            cy.get('[type=password]').should('not.be.disabled').type('rootroot');
            cy.get('form').submit();

            cy.url().should('not.include', '/login');
            cy.get('#home-page').should('exist');
        });

        /*
         * The refresh cookie's expiry is the one observable effect of "remember me": unchecked,
         * the session lasts an access-token window (minutes); checked, days. `jwt` rather than
         * the readable `isAuth` twin, which `session.ts` rewrites as a session cookie — Cypress
         * reads httpOnly cookies, a page script could not.
         */
        it('keeps the session only minutes unless asked to remember', () => {
            cy.get('[type=email]').should('not.be.disabled').type('root@root.it');
            cy.get('[type=password]').should('not.be.disabled').type('rootroot');
            cy.get('form').submit();
            cy.get('#home-page').should('exist');

            cy.getCookie('jwt')
                .should('exist')
                .its('expiry')
                .should('be.lessThan', Date.now() / 1000 + 60 * 60);
        });

        it('remember me keeps the session for days', () => {
            cy.get('[type=email]').should('not.be.disabled').type('root@root.it');
            cy.get('[type=password]').should('not.be.disabled').type('rootroot');
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

        it('signs up successfully and redirects to login (no auto-login)', () => {
            cy.get('[type=email]').should('not.be.disabled').type('newuser@example.com');
            cy.get('[type=password]').eq(0).should('not.be.disabled').type('NewUser_Pass1!');
            cy.get('[type=password]').eq(1).should('not.be.disabled').type('NewUser_Pass1!');
            cy.get('[type=checkbox]').check();
            cy.get('#signup-page button[type="submit"]').click();

            cy.url().should('not.include', '/signup');
            cy.url().should('include', '/login');
            cy.get('#login-page').should('exist');
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
            // Pinned to the API origin, and deliberately not `**/orders*`: that glob also matches
            // this app's own route at `http://localhost:8085/en/orders`, so the request that got
            // the forced 401 was `cy.reload()`'s *document* navigation. The browser then rendered
            // the error JSON as the entire page and the SPA never booted — the row assertion below
            // failed for want of an application, which looks identical to a failed token refresh
            // and is what made this failure so hard to read.
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.intercept('GET', `${apiUrl}/orders*`, (request) => {
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
                            errors: ['Unauthorized']
                        }
                    });
                }).as('ordersForcedOnce');
            });

            cy.reload();

            // If the refresh cookie hadn't crossed the origin boundary, the retried request would
            // 401 again and the app would bounce to /login instead of re-rendering the list.
            cy.url().should('not.include', '/login');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);
        });
    });
});
