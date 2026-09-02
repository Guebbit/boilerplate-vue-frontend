/**
 * @module
 * End-to-end coverage of the products list and detail screens, driven through a real browser
 * against the seeded backend.
 */

/** The list's default page size — see the tests below that can only check this one page. */
const PAGE_ONE_SIZE = 10;

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

        /*
         * The rule, tested as a TRANSITION rather than as a tableau: each case creates a product,
         * confirms an anonymous visitor can see it, hides it one way, and confirms it is gone.
         * A pre-hidden fixture can only show the end state, and cannot tell "the filter works"
         * apart from "that row was never there".
         *
         * `deletedAt` and `active` are independent, so they get one case each — a single mixed
         * assertion would go red without saying which filter moved.
         */
        it('hides soft-deleted products from anonymous visitors', () => {
            cy.createProduct().then((product) => {
                cy.reload();
                cy.contains('[data-test=list-row]', product.title).should('exist');

                cy.softDeleteProduct(product.id);
                cy.reload();
                cy.contains('[data-test=list-row]', product.title).should('not.exist');
            });
        });

        it('hides inactive products from anonymous visitors', () => {
            cy.createProduct().then((product) => {
                cy.reload();
                cy.contains('[data-test=list-row]', product.title).should('exist');

                cy.deactivateProduct(product);
                cy.reload();
                cy.contains('[data-test=list-row]', product.title).should('not.exist');
            });
        });

        // The list an anonymous visitor gets IS the API's public scope — no more, no less, on
        // the one page this list can prove itself against: `pageTotal` here is the CLIENT's own
        // accumulated record count, never the server's total (see the note on `ListPagination`
        // in resilience.cy.ts), so a catalogue bigger than one page is unprovable page-to-page.
        it('renders exactly the publicly visible products for anonymous visitors', () => {
            cy.publicProducts().then((products) => {
                cy.get('[data-test=list-row]').should(
                    'have.length',
                    Math.min(products.length, PAGE_ONE_SIZE)
                );
            });
        });

        // Addressed by title rather than by row index. The API sorts by `createdAt`, and seeded
        // rows can share a millisecond — so which product lands in which row is a property of
        // the seed's insertion timing, not behaviour this spec should pin. The pairing of a
        // title with its price is the actual claim, and it survives any ordering. Only page 1's
        // worth is checked, for the same reason as the test above.
        it('displays product title and price in each row', () => {
            cy.publicProducts().then((products) => {
                for (const product of products.slice(0, PAGE_ONE_SIZE))
                    cy.contains('[data-test=list-row]', product.title).within(() => {
                        cy.contains(String(product.price)).should('exist');
                    });
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
                    cy.get('[data-test=row-hard-delete]').should('not.exist');
                });
        });

        it('shows View, Edit, Delete and Hard delete actions per row for admin users', () => {
            cy.loginAs('admin');
            cy.visit('/en/products');
            cy.get('[data-test=list-row]').should('have.length.at.least', 1);
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.get('[data-test=row-view]').should('exist');
                    cy.get('[data-test=row-edit]').should('exist');
                    cy.get('[data-test=row-delete]').should('exist');
                    cy.get('[data-test=row-hard-delete]').should('exist');
                });
        });

        // The other half of the same rule: what the public list drops, an admin still sees.
        it('shows inactive and soft-deleted products to admin users', () => {
            cy.createProduct().then((softDeleted) =>
                cy.createProduct().then((inactive) => {
                    cy.softDeleteProduct(softDeleted.id);
                    cy.deactivateProduct(inactive);

                    cy.loginAs('admin');
                    cy.visit('/en/products');
                    cy.contains('[data-test=list-row]', softDeleted.title).should('exist');
                    cy.contains('[data-test=list-row]', inactive.title).should('exist');
                })
            );
        });

        // The expected id is read off the row that gets clicked, not hard-coded. The API sorts by
        // `createdAt DESC, _id DESC` and the seeded rows can share a millisecond, so which product
        // occupies row 0 is a property of fixture insertion timing rather than of the navigation
        // this spec is about. The id is read synchronously off the jQuery element inside a single
        // `.then()`: re-entering the chain with `.eq(0).find('td').first().invoke('text')` before
        // clicking fails with `cy.eq() failed because it requires a DOM element`.
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
        /*
         * `rich` rather than `inStock`, because the cases below assert on a description and a
         * price: the role has to guarantee the fields being read, or the spec is one dataset
         * away from asserting on an empty string. Every expectation is taken off the record the
         * API served, so the page is checked against the answer rather than against a catalogue
         * somebody remembered.
         */
        let subject: { id: string; title: string; price: number; description?: string };

        beforeEach(() => {
            cy.productInRole('rich').then((product) => {
                subject = product;
                cy.visit(`/en/products/${product.id}`);
            });
            cy.get('#product-target').should('exist');
        });

        it('shows the product detail page', () => {
            cy.get('#product-target').should('exist');
            cy.get('h1').should('exist');
        });

        it('displays the product title', () => {
            cy.contains(subject.title).should('exist');
        });

        it('displays the product price', () => {
            cy.contains(String(subject.price)).should('exist');
        });

        it('displays the product description', () => {
            cy.contains(subject.description ?? '').should('exist');
        });

        it('has a link back to the products list', () => {
            cy.contains('Go to products list').should('exist');
        });
    });
});
