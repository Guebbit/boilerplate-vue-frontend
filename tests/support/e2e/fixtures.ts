/// <reference types="cypress" />

/**
 * Demo-dataset access that names a ROLE rather than a record.
 *
 * The specs run against whichever backend the profile supplied, and an id or a title is that
 * backend's private choice — `Id` is deliberately format-free in the shared contract, so a spec
 * naming one has adopted a constraint the contract refused to make. Two ways out, and the choice
 * between them is about what the spec is for:
 *
 * - `cy.productInRole()` and `cy.accountInRole()` FIND a subject. For specs that need a product or
 *   a user to act on but do not care which — a detail page to audit, a row to edit, an event to
 *   attribute.
 * - `cy.createProduct()` / `cy.softDeleteProduct()` / `cy.deactivateProduct()` MAKE one. For specs
 *   asserting a visibility RULE: creating the row and hiding it tests the transition, where a
 *   pre-hidden fixture only tests a tableau.
 */

import { E2E_ACCOUNTS, type E2ERole } from './accounts';

/**
 * The `Product` fields the roles below branch on.
 *
 * Structural rather than imported from `@api`: `tsconfig.cypress.json` is a composite project
 * that does not claim `contracts/`, and the roles only ever read these six.
 */
interface ProductLike {
    id: string;
    title: string;
    price: number;
    onHand?: number;
    description?: string;
    categories?: string[];
}

export type ProductRole = 'inStock' | 'rich' | 'outOfStock';

/*
 * What each role MEANS, in the contract's vocabulary — not which record happens to fill it.
 *
 * `rich` is the shape with every optional field populated — its opposite, the bare shape
 * `POST /products` answers with when only the required fields are sent, has no e2e case that
 * needs a real backend to draw one: `src/modules/products/tests/product-view.spec.ts` seeds that
 * shape directly and asserts on it in milliseconds, which is what it means for a shape to not
 * need a fixture. Asking for `inStock` and then asserting on a description gets whichever the
 * backend happened to list first — and a case that skips when it draws the wrong one reports
 * success while covering nothing.
 */
const ROLE_PREDICATES: Record<ProductRole, (product: ProductLike) => boolean> = {
    inStock: (product) => (product.onHand ?? 0) > 0,
    rich: (product) =>
        (product.onHand ?? 0) > 0 &&
        Boolean(product.description) &&
        (product.categories?.length ?? 0) > 0,
    outOfStock: (product) => product.onHand === 0
};

/*
 * Every role above is publicly visible, so the lookup uses the PUBLIC list: no login, no admin
 * token, and nothing that could disturb the session or analytics state a spec is measuring.
 * `pageSize` is the contract maximum (`shared/contracts/openapi.root.yaml`'s `PageSize.maximum`) —
 * a backend may seed more rows than that in total, which is what `publicProducts()` below walks
 * every page for, rather than assuming one request is the whole catalogue.
 */
const PUBLIC_PAGE_SIZE = 100;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        interface Chainable {
            /**
             * The first product in the demo dataset filling `role`, read off the running backend.
             *
             * Throws naming the role when the dataset has none — a backend seeded without one
             * cannot cover the branch behind it, and that should fail loudly rather than leave a
             * spec quietly asserting nothing.
             *
             * @param role - which branch the spec needs a subject for
             */
            productInRole(role: ProductRole): Chainable<ProductLike>;

            /**
             * Every product an anonymous visitor may see, as the API lists them.
             *
             * The answer to "how many of these should the page show" and "what should this facet
             * chip count", derived rather than counted by hand — so the assertion keeps holding
             * when the dataset grows or the backend changes.
             */
            publicProducts(): Chainable<ProductLike[]>;

            /**
             * The caller's first order that can still be cancelled, read as admin.
             *
             * @param role - the only role so far: an order the cancel gate is open on
             */
            orderInRole(role: 'cancellable'): Chainable<{ id: string; status: string }>;

            /**
             * The seeded account `cy.loginAs(role)` signs in as, as the API serialises it.
             *
             * A page addressed by a user's id — `/en/users/{id}` and its edit form — needs one,
             * and the id is the backend's to choose. The account asks the API who it is instead:
             * the credentials in `accounts.ts` are the suite's own, honoured by every backend that
             * can pair with this repo, so they name a subject without naming a record.
             *
             * @param role - which of the two seeded accounts
             */
            accountInRole(role: E2ERole): Chainable<{ id: string; email: string }>;

            /**
             * Creates a product as admin, server-side, and yields it as the API serialised it.
             *
             * Defaults to the minimal body the contract requires, so the created row is also the
             * barebones serialisation shape unless the caller says otherwise.
             *
             * @param overrides - fields to send instead of, or beside, the defaults
             */
            createProduct(overrides?: Record<string, unknown>): Chainable<ProductLike>;

            /**
             * Soft-deletes a product as admin — `DELETE /products/{id}`, which sets `deletedAt`.
             *
             * @param id - the product to hide
             */
            softDeleteProduct(id: string): Chainable<null>;

            /**
             * Marks a product inactive as admin — soft-delete's independent twin.
             *
             * @param id - the product to unpublish
             */
            deactivateProduct(product: ProductLike): Chainable<null>;

            /**
             * Creates an order owned by the named role's seeded account, server-side as admin,
             * carrying one line of a freshly created product.
             *
             * Provisions rather than reads: `orderInRole`'s dataset is the admin's own orders, and
             * the seeded `user` account's one fixture is soft-deleted on purpose (see
             * `orders/demo.ts`) — so a spec needing that account's own, VISIBLE order has nothing
             * to find and must make one.
             *
             * @param role - whose account the order is created under
             */
            createOrder(role: E2ERole): Chainable<{ id: string; userId: string; status: string }>;
        }
    }
}

/** One page of the public catalogue, plus how many pages exist in total. */
const publicProductsPage = (
    apiUrl: string,
    page: number
): Cypress.Chainable<{ items: ProductLike[]; totalPages: number }> =>
    cy
        .request(`${apiUrl}/products?pageSize=${String(PUBLIC_PAGE_SIZE)}&page=${String(page)}`)
        .then((response) => {
            const { items, meta } = (
                response.body as {
                    data: { items: ProductLike[]; meta: { totalPages: number } };
                }
            ).data;
            return { items, totalPages: meta.totalPages };
        });

/**
 * Walks every page from `page` onward, accumulating into `gathered` — one request per page is
 * the cost of a catalogue larger than the contract's single-page maximum.
 */
const walkPublicProducts = (
    apiUrl: string,
    page: number,
    gathered: ProductLike[]
): Cypress.Chainable<ProductLike[]> =>
    publicProductsPage(apiUrl, page).then(({ items, totalPages }) => {
        const soFar = [...gathered, ...items];
        return page < totalPages ? walkPublicProducts(apiUrl, page + 1, soFar) : cy.wrap(soFar);
    });

Cypress.Commands.add('publicProducts', () =>
    cy.env(['apiUrl']).then(({ apiUrl }) => walkPublicProducts(String(apiUrl), 1, []))
);

Cypress.Commands.add('productInRole', (role: ProductRole) =>
    cy.publicProducts().then((items) => {
        const found = items.find((product) => ROLE_PREDICATES[role](product));
        if (!found)
            throw new Error(
                `productInRole: this backend's demo dataset has no product in role "${role}" ` +
                    `(${String(items.length)} publicly visible products were offered)`
            );
        return found;
    })
);

/*
 * Writes go through a Node-side task rather than `cy.request`, for the reason the `createSession`
 * task already exists: the app holds its access token in a Pinia store, so a browser-side admin
 * call would have to log in again and leave a refresh cookie behind — which the sessions specs
 * count and the analytics spec attributes.
 */
const apiAs = <T>(role: E2ERole, path: string, method: string, body?: Record<string, unknown>) =>
    cy.env(['apiUrl']).then(({ apiUrl }) =>
        cy.task<T>('adminApi', {
            apiUrl: String(apiUrl),
            path,
            method,
            body,
            ...E2E_ACCOUNTS[role]
        })
    );

/** The overwhelmingly common case: provisioning needs the admin. */
const adminApi = <T>(path: string, method: string, body?: Record<string, unknown>) =>
    apiAs<T>('admin', path, method, body);

Cypress.Commands.add('createProduct', (overrides: Record<string, unknown> = {}) =>
    adminApi<ProductLike>('/products', 'POST', {
        // Unique per test, so a title assertion cannot pass on a row some other case created.
        title: `e2e ${Cypress.state('runnable').id as string}`,
        price: 10,
        ...overrides
    })
);

Cypress.Commands.add('softDeleteProduct', (id: string) =>
    adminApi<null>(`/products/${id}`, 'DELETE')
);

/*
 * `title` and `price` ride along because `UpdateProductByIdRequest` declares them REQUIRED: the
 * update route replaces rather than patches, so a body carrying only `active` is a 422.
 */
Cypress.Commands.add('deactivateProduct', (product: ProductLike) =>
    adminApi<null>(`/products/${product.id}`, 'PUT', {
        title: product.title,
        price: product.price,
        active: false
    })
);

Cypress.Commands.add('accountInRole', (role: E2ERole) =>
    apiAs<{ id: string; email: string }>(role, '/account', 'GET').then((account) => {
        if (!account)
            throw new Error(
                `accountInRole: GET /account answered no body for the "${role}" account`
            );
        return account;
    })
);

/*
 * Orders are per-caller, so this one cannot use the public list: it reads them as the admin the
 * order specs sign in as. `pending` is the status the cancel gate is open on — the page hides the
 * button for every other, so a spec clicking it needs the role rather than the row.
 *
 * Restricted to the admin's OWN orders, which is not the same set: staff read every caller's, and
 * "cancel, then buy again" is an action on your own — buying again from someone else's order
 * refills nothing. The account is asked for its id rather than told one.
 */
Cypress.Commands.add('createOrder', (role: E2ERole) =>
    cy.accountInRole(role).then((account) =>
        cy.createProduct().then((product) =>
            adminApi<{ id: string; userId: string; status: string }>('/orders', 'POST', {
                userId: account.id,
                email: account.email,
                items: [{ productId: product.id, quantity: 1 }]
            })
        )
    )
);

Cypress.Commands.add('orderInRole', (role: 'cancellable') =>
    cy.accountInRole('admin').then((account) =>
        adminApi<{ items: { id: string; status: string; userId?: string }[] }>(
            `/orders?pageSize=${String(PUBLIC_PAGE_SIZE)}`,
            'GET'
        ).then((page) => {
            const found = page?.items.find(
                (order) => order.status === 'pending' && order.userId === account.id
            );
            if (!found)
                throw new Error(
                    `orderInRole: this backend's demo dataset gives the admin no "${role}" order`
                );
            return found;
        })
    )
);
