describe('Products', () => {
    describe('Products list', () => {
        beforeEach(() => {
            cy.intercept('GET', Cypress.env('apiUrl') + '/products*', {
                fixture: 'products/list'
            }).as('products');
            cy.visit('/en/products');
            cy.wait('@products');
        });

        it('shows the page title and a product table', () => {
            cy.get('#products-list-page').should('exist');
            cy.get('h1').should('contain.text', 'Products list');
        });

        it('renders one row per product returned by the API', () => {
            cy.get('.users-table tbody tr').should('have.length', 2);
        });

        it('displays product title and price in each row', () => {
            cy.get('.users-table tbody tr')
                .eq(0)
                .within(() => {
                    cy.contains('Product Alpha').should('exist');
                    cy.contains('10').should('exist');
                });
            cy.get('.users-table tbody tr')
                .eq(1)
                .within(() => {
                    cy.contains('Product Beta').should('exist');
                    cy.contains('25.5').should('exist');
                });
        });

        it('shows View, Edit and Delete actions per row', () => {
            cy.get('.users-table tbody tr')
                .eq(0)
                .within(() => {
                    cy.contains('View').should('exist');
                    cy.contains('Edit').should('exist');
                    cy.contains('Delete').should('exist');
                });
        });

        it('navigates to product detail when clicking View', () => {
            cy.intercept('GET', Cypress.env('apiUrl') + '/products/prod-1', {
                fixture: 'products/single'
            }).as('product');
            cy.get('.users-table tbody tr').eq(0).contains('View').click();
            cy.wait('@product');
            cy.url().should('include', '/products/prod-1');
        });
    });

    describe('Product detail', () => {
        beforeEach(() => {
            cy.intercept('GET', Cypress.env('apiUrl') + '/products/prod-1', {
                fixture: 'products/single'
            }).as('product');
            cy.visit('/en/products/prod-1');
            cy.wait('@product');
        });

        it('shows the product detail page', () => {
            cy.get('#product-target').should('exist');
            cy.get('h1').should('exist');
        });

        it('displays the product title', () => {
            cy.contains('Product Alpha').should('exist');
        });

        it('displays the product price', () => {
            cy.contains('10').should('exist');
        });

        it('displays the product description', () => {
            cy.contains('First test product').should('exist');
        });

        it('has a link back to the products list', () => {
            cy.contains('Go to products list').should('exist');
        });
    });
});
