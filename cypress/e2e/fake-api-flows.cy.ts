describe('Fake API flows', () => {
    it('loads products list with plausible data', () => {
        cy.visit('/products');
        cy.contains('h1', 'Products list').should('be.visible');
        cy.get('table tbody tr').should('have.length.greaterThan', 0);
        cy.contains('Mechanical Keyboard Pro').should('be.visible');
    });

    it('supports cart checkout and renders orders', () => {
        cy.visit('/cart');
        cy.contains('h1', 'My Cart').should('be.visible');
        cy.contains('button', 'Checkout').click();
        cy.url().should('include', '/orders');
        cy.contains('h1', 'My Orders').should('be.visible');
        cy.get('table tbody tr').should('have.length.greaterThan', 0);
    });

    it('allows admin users page access and renders users list', () => {
        cy.visit('/users');
        cy.contains('h1', 'Users list').should('be.visible');
        cy.get('table tbody tr').should('have.length.greaterThan', 0);
        cy.contains('root@root.it').should('be.visible');
    });
});
