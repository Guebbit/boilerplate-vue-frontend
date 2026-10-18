// requires-module: none
/**
 * @module
 * Every address the backend's sitemap lists opens a real page of this app: not the error page, and
 * not marked `noindex`. It catches a frontend route that was renamed while the backend's page list
 * (or its product link template) still points at the old name.
 *
 * Reads `GET /sitemap/pages.xml` and the first products file the index names, takes the path of each
 * `<loc>` (the origin is the backend's `NODE_FRONTEND_URL`, not necessarily this run's), and visits it.
 */

/** Most product pages visited: each is a full page load, and one file can hold 50,000. */
const PRODUCT_PAGE_LIMIT = 6;

/** The paths of every `<loc>` in a sitemap document, without repeats. */
const pathsOf = (xml: string): string[] => [
    ...new Set(
        [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, address]) => new URL(address).pathname)
    )
];

/** Visits `path` and checks it is a page of the app that search may list. */
const expectIndexablePage = (path: string): void => {
    cy.visit(path);
    cy.get('main').should('exist');
    cy.location('pathname').should('not.contain', '/error/');
    cy.document().then((document) => {
        expect(document.head.querySelector('meta[name="robots"]'), `${path} robots meta`).to.equal(
            null
        );
    });
};

describe('The sitemap', () => {
    it('lists only addresses that open a real, indexable page', () => {
        cy.env(['apiUrl']).then(({ apiUrl }) => {
            const api = String(apiUrl);

            cy.request({ url: `${api}/sitemap/pages.xml` }).then(({ body }) => {
                const pages = pathsOf(String(body));

                // The home page in every language is among them: the list is not empty by accident.
                expect(pages).to.include('/en');
                for (const path of pages) expectIndexablePage(path);
            });

            cy.request({ url: `${api}/sitemap/index.xml` }).then(({ body }) => {
                const files = [...String(body).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
                    ([, address]) => address
                );
                const productFile = files.find((address) => address.includes('/sitemap/products-'));
                // A catalogue with no public product has no products file; nothing more to open.
                if (!productFile) return;

                cy.request({ url: `${api}${new URL(productFile).pathname}` }).then(
                    ({ body: products }) => {
                        for (const path of pathsOf(String(products)).slice(0, PRODUCT_PAGE_LIMIT))
                            expectIndexablePage(path);
                    }
                );
            });
        });
    });
});
