describe('Products', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
    });

    describe('Products list', () => {
        beforeEach(() => {
            cy.visit('/en/products');
            cy.get('[data-test=list-row]').should('have.length.at.least', 1);
        });

        it('shows the page title and a product table', () => {
            cy.get('#products-list-page').should('exist');
            cy.get('h1').should('contain.text', 'Products list');
        });

        it('renders one row per product returned by the API', () => {
            cy.get('[data-test=list-row]').should('have.length', 3);
        });

        it('displays product title and price in each row', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.contains('Product Alpha').should('exist');
                    cy.contains('10').should('exist');
                });
            cy.get('[data-test=list-row]')
                .eq(1)
                .within(() => {
                    cy.contains('Product Beta').should('exist');
                    cy.contains('25.5').should('exist');
                });
        });

        it('shows only the View action for non-admin users', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.get('[data-test=row-view]').should('exist');
                    cy.get('[data-test=row-edit]').should('not.exist');
                    cy.get('[data-test=row-delete]').should('not.exist');
                });
        });

        it('shows View, Edit and Delete actions per row for admin users', () => {
            cy.loginAs('admin');
            cy.visit('/en/products');
            cy.get('[data-test=list-row]').should('have.length.at.least', 1);
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.get('[data-test=row-view]').should('exist');
                    cy.get('[data-test=row-edit]').should('exist');
                    cy.get('[data-test=row-delete]').should('exist');
                });
        });

        it('navigates to product detail when clicking View', () => {
            cy.get('[data-test=list-row]').eq(0).find('[data-test=row-view]').click();
            cy.url().should('include', '/products/prod-1');
            cy.get('#product-target').should('exist');
        });
    });

    describe('Product detail', () => {
        beforeEach(() => {
            cy.visit('/en/products/prod-1');
            cy.get('#product-target').should('exist');
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
