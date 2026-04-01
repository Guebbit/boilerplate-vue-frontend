describe('Public routes', () => {
    const publicRoutes = ['/', '/login', '/signup', '/products', '/error/404/not-found'];

    for (const route of publicRoutes) {
        it(`renders ${route} without frontend errors`, () => {
            cy.visit(route);
            cy.get('body').should('be.visible');
            cy.get('main.page-content').should('exist');
            cy.get('h1').should('exist');
        });
    }
});
