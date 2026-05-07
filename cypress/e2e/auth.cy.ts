describe('Authentication', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
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
            cy.get('[type=email]').type('not-an-email');
            cy.get('[type=password]').type('somepassword');
            cy.get('form').submit();
            cy.get('.form-error-message').should('exist');
        });

        it('shows a validation error when the form is empty', () => {
            cy.get('[type=email]').clear();
            cy.get('[type=password]').clear();
            cy.get('form').submit();
            cy.get('.form-error-message').should('exist');
        });

        it('logs in successfully and redirects to home', () => {
            cy.get('[type=email]').clear();
            cy.get('[type=email]').type('root@root.it');
            cy.get('[type=password]').clear();
            cy.get('[type=password]').type('rootroot');
            cy.get('form').submit();

            cy.url().should('not.include', '/login');
            cy.get('#home-page').should('exist');
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
            cy.get('[type=email]').type('newuser@example.com');
            cy.get('[type=password]').eq(0).type('rootroot');
            cy.get('[type=password]').eq(1).type('DifferentPass_456!');
            cy.get('[type=checkbox]').check();
            cy.get('#signup-page button[type="submit"]').click();
            cy.get('.form-error-message').should('exist');
        });

        it('signs up successfully and redirects', () => {
            cy.get('[type=email]').type('newuser@example.com');
            cy.get('[type=password]').eq(0).type('rootroot');
            cy.get('[type=password]').eq(1).type('rootroot');
            cy.get('[type=checkbox]').check();
            cy.get('#signup-page button[type="submit"]').click();

            cy.url().should('not.include', '/signup');
            cy.get('#home-page').should('exist');
        });
    });

    describe('Route guards', () => {
        it('redirects an unauthenticated user from /cart to login', () => {
            cy.visit('/en/cart');
            cy.url().should('include', '/login');
        });

        it('redirects an unauthenticated user from /orders to login', () => {
            cy.visit('/en/orders');
            cy.url().should('include', '/login');
        });

        it('redirects an authenticated user away from the login page', () => {
            cy.loginAs('user');
            cy.visit('/en/login');
            cy.url().should('not.include', '/login');
        });

        it('redirects an unauthenticated user from admin-only /users to login', () => {
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
});
