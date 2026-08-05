describe('Products', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
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

        // `cy.resetState()` clears the session, so these run as an anonymous visitor.
        // Of the five seeded products one is soft-deleted and one is inactive, and the API
        // hides both from non-admins — so the public list is 3, not 5. This assertion read
        // `5` until the mock handler learned the BE's active/deletedAt filtering; it passed
        // against mocks and would have failed against the real API.
        it('renders only publicly visible products for anonymous visitors', () => {
            cy.get('[data-test=list-row]').should('have.length', 3);
            cy.contains('[data-test=list-row]', 'Sallyno Carino').should('not.exist'); // soft-deleted
            cy.contains('[data-test=list-row]', 'Bundle micini').should('not.exist'); // inactive
        });

        it('displays product title and price in each row', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.contains('Sallyno Panino').should('exist');
                    cy.contains('100').should('exist');
                });
            cy.get('[data-test=list-row]')
                .eq(2)
                .within(() => {
                    cy.contains('Micino pufettino').should('exist');
                    cy.contains('77').should('exist');
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

        // The other half of the same rule. Before the handler applied role scoping both
        // roles saw 5 rows, so this distinction could not be tested at all.
        it('shows inactive and soft-deleted products to admin users', () => {
            cy.loginAs('admin');
            cy.visit('/en/products');
            cy.get('[data-test=list-row]').should('have.length', 5);
            cy.contains('[data-test=list-row]', 'Sallyno Carino').should('exist');
            cy.contains('[data-test=list-row]', 'Bundle micini').should('exist');
        });

        it('navigates to product detail when clicking View', () => {
            cy.get('[data-test=list-row]').eq(0).find('[data-test=row-view]').click();
            cy.url().should('include', '/products/65dc8a99604c307b702b5ccc');
            cy.get('#product-target').should('exist');
        });
    });

    describe('Product detail', () => {
        beforeEach(() => {
            cy.visit('/en/products/65dc8a99604c307b702b5ccc');
            cy.get('#product-target').should('exist');
        });

        it('shows the product detail page', () => {
            cy.get('#product-target').should('exist');
            cy.get('h1').should('exist');
        });

        it('displays the product title', () => {
            cy.contains('Sallyno Panino').should('exist');
        });

        it('displays the product price', () => {
            cy.contains('100').should('exist');
        });

        it('displays the product description', () => {
            cy.contains('Piccolo Sallyno panino. Da mangiare di coccole').should('exist');
        });

        it('has a link back to the products list', () => {
            cy.contains('Go to products list').should('exist');
        });
    });
});
