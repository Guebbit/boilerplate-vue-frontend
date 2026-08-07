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

        // Addressed by title rather than by row index. The API sorts by `createdAt`, and seeded
        // rows can share a millisecond — so which product lands in which row is a property of
        // the fixture's insertion timing, not behaviour this spec should pin. Indexing rows
        // asserted the mock's array order against a real database and failed for that reason
        // alone. The pairing of a title with its price is the actual claim, and it survives any
        // ordering.
        it('displays product title and price in each row', () => {
            cy.contains('[data-test=list-row]', 'Sallyno Panino').within(() => {
                cy.contains('100').should('exist');
            });
            cy.contains('[data-test=list-row]', 'Micino pufettino').within(() => {
                cy.contains('77').should('exist');
            });
        });

        // The list is public, the create page is not: `products/create` is guarded by `isAdmin`,
        // so offering the button to an anonymous visitor would be an invitation to a redirect.
        it('offers the Create product button to admins only', () => {
            cy.get('[data-test=create-product]').should('not.exist');

            cy.loginAs('admin');
            cy.visit('/en/products');
            cy.get('[data-test=create-product]').should('exist').click();

            cy.url().should('include', '/products/create');
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

        // The expected id is read off the row that gets clicked, not hard-coded. The API sorts by
        // `createdAt DESC, _id DESC` and the seeded rows can share a millisecond, so which product
        // occupies row 0 is a property of fixture insertion timing rather than of the navigation
        // this spec is about — pinning the mock's first product asserted the fixture's array order
        // against a real database. The id is read synchronously off the jQuery element inside a
        // single `.then()`: re-entering the chain with `.eq(0).find('td').first().invoke('text')`
        // and then clicking is what produced `cy.eq() failed because it requires a DOM element`.
        it('navigates to product detail when clicking View', () => {
            cy.get('[data-test=list-row]')
                .first()
                .then(($row) => {
                    const productId = $row.find('td').first().text().trim();
                    cy.wrap($row).find('[data-test=row-view]').click();
                    cy.url().should('include', `/products/${productId}`);
                });
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
