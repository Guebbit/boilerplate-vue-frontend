describe('Public routes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
    });

    it('loads home page at locale-prefixed URL', () => {
        cy.visit('/en');
        cy.get('#home-page').should('exist');
        cy.get('h1').should('exist');
    });

    it('redirects / to the locale-prefixed home', () => {
        cy.visit('/');
        cy.url().should('match', /\/[a-z]{2}(\/|$)/);
        cy.get('h1').should('exist');
    });

    it('loads the products list page', () => {
        cy.visit('/en/products');
        cy.get('#products-list-page').should('exist');
        cy.get('h1').should('contain.text', 'Products list');
    });

    it('loads the login page', () => {
        cy.visit('/en/login');
        cy.get('#login-page').should('exist');
        cy.get('[type=email]').should('exist');
        cy.get('[type=password]').should('exist');
    });

    it('loads the signup page', () => {
        cy.visit('/en/signup');
        cy.get('#signup-page').should('exist');
        cy.get('[type=email]').should('exist');
        cy.get('[type=password]').eq(0).should('exist');
        cy.get('[type=password]').eq(1).should('exist');
    });

    it('shows 404 error page for unknown routes', () => {
        cy.visit('/en/error/404/not-found');
        cy.get('h1').should('contain.text', '404');
    });
});
