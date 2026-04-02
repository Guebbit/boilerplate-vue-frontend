describe('Public routes', () => {
    const publicRoutes = ['/', '/login', '/signup', '/products'];

    for (const route of publicRoutes) {
        it(`loads ${route} and shows basic page content`, () => {
            cy.visit(route);
            cy.get('body').should('be.visible');
            cy.get('h1').should('exist');
        });
    }

    it('loads error route and shows 404 page', () => {
        cy.visit('/error/404/not-found');
        cy.get('body').should('be.visible');
        cy.get('h1').should('contain.text', '404');
    });
});
