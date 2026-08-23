/// <reference types="cypress" />

/**
 * Demo-dataset access that names a ROLE rather than a record.
 *
 * The specs run against whichever backend the profile supplied, and an id or a title is that
 * backend's private choice — `Id` is deliberately format-free in the shared contract, so a spec
 * naming one has adopted a constraint the contract refused to make. Two ways out, and the choice
 * between them is about what the spec is for:
 *
 * - `cy.productInRole()` FINDS a subject. For specs that need a product to act on but do not care
 *   which — a detail page to audit, a row to edit, an event to attribute.
 * - `cy.createProduct()` / `cy.softDeleteProduct()` / `cy.deactivateProduct()` MAKE one. For specs
 *   asserting a visibility RULE: creating the row and hiding it tests the transition, where a
 *   pre-hidden fixture only tests a tableau.
 */

import { E2E_ACCOUNTS } from './accounts';

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

export type ProductRole = 'inStock' | 'rich' | 'outOfStock' | 'minimal';

/*
 * What each role MEANS, in the contract's vocabulary — not which record happens to fill it.
 *
 * `minimal` and `rich` are the two ends of the same axis, and a spec has to say which it needs:
 * `minimal` is the shape `POST /products` answers with when only the required fields are sent,
 * and `rich` is the one with every optional field populated. Asking for `inStock` and then
 * asserting on a description gets whichever the backend happened to list first — and a case that
 * skips when it draws the wrong one reports success while covering nothing.
 */
const ROLE_PREDICATES: Record<ProductRole, (product: ProductLike) => boolean> = {
    inStock: (product) => (product.onHand ?? 0) > 0,
    rich: (product) =>
        (product.onHand ?? 0) > 0 &&
        Boolean(product.description) &&
        (product.categories?.length ?? 0) > 0,
    outOfStock: (product) => product.onHand === 0,
    minimal: (product) => !product.description && (product.categories?.length ?? 0) === 0
};

/*
 * Every role above is publicly visible, so the lookup uses the PUBLIC list: no login, no admin
 * token, and nothing that could disturb the session or analytics state a spec is measuring.
 * `pageSize` is the contract maximum, because a backend may seed more rows than one default page.
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
        }
    }
}

Cypress.Commands.add('publicProducts', () =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.request(`${String(apiUrl)}/products?pageSize=${String(PUBLIC_PAGE_SIZE)}`)
        )
        .then((response) => (response.body as { data: { items: ProductLike[] } }).data.items)
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
const adminApi = <T>(path: string, method: string, body?: Record<string, unknown>) =>
    cy.env(['apiUrl']).then(({ apiUrl }) =>
        cy.task<T>('adminApi', {
            apiUrl: String(apiUrl),
            path,
            method,
            body,
            ...E2E_ACCOUNTS.admin
        })
    );

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

/*
 * Orders are per-caller, so this one cannot use the public list: it reads them as the admin the
 * order specs sign in as. `pending` is the status the cancel gate is open on — the page hides the
 * button for every other, so a spec clicking it needs the role rather than the row.
 *
 * Restricted to the admin's OWN orders, which is not the same set: staff read every caller's, and
 * "cancel, then buy again" is an action on your own — buying again from someone else's order
 * refills nothing. The account is asked for its id rather than told one.
 */
Cypress.Commands.add('orderInRole', (role: 'cancellable') =>
    adminApi<{ id: string }>('/account', 'GET').then((account) =>
        adminApi<{ items: { id: string; status: string; userId?: string }[] }>(
            `/orders?pageSize=${String(PUBLIC_PAGE_SIZE)}`,
            'GET'
        ).then((page) => {
            const found = page?.items.find(
                (order) => order.status === 'pending' && order.userId === account?.id
            );
            if (!found)
                throw new Error(
                    `orderInRole: this backend's demo dataset gives the admin no "${role}" order`
                );
            return found;
        })
    )
);
