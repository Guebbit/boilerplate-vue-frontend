/// <reference types="cypress" />

/**
 * Demo-dataset access that names a PROPERTY rather than a record.
 *
 * The specs run against whichever backend the profile supplied, and an id or a title is that
 * backend's private choice — `Id` is deliberately format-free in the shared contract, so a spec
 * naming one has adopted a constraint the contract refused to make. Three ways out, and the
 * choice between them is about what the spec is for:
 *
 * - `cy.subjectId()` ASKS the backend which row fills a named guarantee (`./scenario.ts`), and
 *   `cy.subjectProduct()` fetches that row. For specs that need a product or an order in a
 *   particular state — a detail page to audit, an out-of-stock badge to see. The backend PROMISES
 *   the name; nothing here guesses at a row.
 * - `cy.accountInRole()` FINDS a person, by asking the API who a seeded login is.
 * - `cy.createProduct()` / `cy.softDeleteProduct()` / `cy.deactivateProduct()` MAKE one. For specs
 *   asserting a visibility RULE: creating the row and hiding it tests the transition, where a
 *   pre-hidden fixture only tests a tableau.
 */

import { seedAccount, type E2ERole } from './scenario';
import { asStub } from '../stub';

/**
 * The slice of Cypress' undocumented, internal `state()` API this file reads: the currently
 * running Mocha test, for a per-test-unique id. Not part of the public `Cypress` type, so the
 * access goes through `asStub` rather than a bare `as` — the repo's one sanctioned seam for a
 * value that cannot structurally satisfy the framework type it stands in for.
 */
interface CypressWithRunnableState {
    state: (key: 'runnable') => { id: string };
}

/**
 * The `Product` fields anything here reads: an id to visit, a title and a price to assert on, and
 * the categories the storefront's facet chips count.
 *
 * Structural rather than imported from `@api`: `tsconfig.cypress.json` is a composite project
 * that does not claim `contracts/`.
 */
interface ProductLike {
    id: string;
    title: string;
    price: number;
    categories?: string[];
}

/**
 * The `Order` fields a spec reads off a guarantee — its id, its status, and the first line's
 * product title. Structural for the same reason {@link ProductLike} is.
 */
interface OrderLike {
    id: string;
    status: string;
    items: { product: { title: string } }[];
}

/**
 * The `WebhookSubscription` fields the a11y sweep reads. Structural for the same reason
 * {@link ProductLike} is — `tsconfig.cypress.json` does not claim `contracts/`.
 */
interface WebhookSubscriptionLike {
    id: string;
    url: string;
    eventTypes: string[];
}

interface ApiKeyLike {
    id: string;
    name: string;
    publicPrefix: string;
    permissions: string[];
    secret: string;
}

/*
 * `publicProducts()` reads the PUBLIC list: no login, no admin token, and nothing that could
 * disturb the session or analytics state a spec is measuring. `pageSize` is the contract maximum
 * (`shared/contracts/openapi.root.yaml`'s `PageSize.maximum`) — a backend seeds more rows than
 * that in total, which is what the walk below exists for rather than assuming one request is the
 * whole catalogue. Its readers need the WHOLE list: a facet count, and a title-to-id map.
 */
const PUBLIC_PAGE_SIZE = 100;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        interface Chainable {
            /**
             * The catalogue row behind a `product.*` guarantee, as the public API serves it.
             *
             * `cy.subjectId()` answers the id; this is for the two specs that also need the row —
             * a title to assert against, a price to read. The PUBLIC endpoint, so it covers the
             * buyable guarantees (`product.inStock`, `product.rich`, `product.outOfStock`) and
             * not the hidden ones, which by definition no anonymous request can fetch.
             *
             * @param name - a `product.*` guarantee name
             */
            subjectProduct(name: string): Chainable<ProductLike>;

            /**
             * Every product an anonymous visitor may see, as the API lists them.
             *
             * The answer to "how many of these should the page show" and "what should this facet
             * chip count", derived rather than counted by hand — so the assertion keeps holding
             * when the dataset grows or the backend changes.
             */
            publicProducts(): Chainable<ProductLike[]>;

            /**
             * The order behind an `order.*` guarantee, as the admin reads it.
             *
             * `cy.subjectId()` answers the id; this is for the spec that also needs a line off the
             * order — the product title to look for once "buy again" has refilled the cart, which
             * is what separates "reorder put THIS back" from "the cart was not empty". Read as the
             * owner, orders being per-caller.
             *
             * @param name - an `order.*` guarantee name
             */
            subjectOrder(name: string): Chainable<OrderLike>;

            /**
             * The seeded account `cy.loginAs(role)` signs in as, as the API serialises it.
             *
             * A page addressed by a user's id — `/en/users/{id}` and its edit form — needs one,
             * and the id is the backend's to choose. `cy.account()` answers WHO to sign in as and
             * this answers WHAT the API calls them, by asking `GET /account` with their own
             * credentials — so a subject is named without a record being named.
             *
             * @param role - which seeded account
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
             * Provisions rather than reads: the backend's `order.*` guarantees name the admin's
             * orders, and the one it puts on the `user` account is soft-deleted on purpose — so a
             * spec needing that account's own, VISIBLE order has nothing to ask for and must make
             * one.
             *
             * @param role - whose account the order is created under
             */
            createOrder(role: E2ERole): Chainable<{ id: string; userId: string; status: string }>;

            /**
             * Creates a webhook subscription as admin, server-side, and yields it as the API
             * serialised it — the webhooks module has no seeded demo fixture to look one up from,
             * so a page addressed by a subscription's id (its detail/edit routes, and a deep-linked
             * delivery-log filter) needs one made rather than found.
             *
             * @param overrides - fields to send instead of, or beside, the defaults
             */
            createWebhookSubscription(
                overrides?: Record<string, unknown>
            ): Chainable<WebhookSubscriptionLike>;

            /**
             * Mints a machine-to-machine credential as admin, server-side, and yields it as the
             * API serialised it (secret included) — the api-keys module has no seeded demo
             * fixture, so a page exercising an existing credential's row needs one minted rather
             * than found.
             *
             * @param overrides - fields to send instead of, or beside, the defaults
             */
            mintApiKey(overrides?: Record<string, unknown>): Chainable<ApiKeyLike>;
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

Cypress.Commands.add('subjectProduct', (name: string) =>
    cy
        .subjectId(name)
        .then((id) =>
            cy
                .env(['apiUrl'])
                .then(({ apiUrl }) =>
                    cy
                        .request(`${String(apiUrl)}/products/${id}`)
                        .then((response) => (response.body as { data: ProductLike }).data)
                )
        )
);

/*
 * Writes go through a Node-side task rather than `cy.request`, for the reason the `createSession`
 * task already exists: the app holds its access token in a Pinia store, so a browser-side admin
 * call would have to log in again and leave a refresh cookie behind — which the sessions specs
 * count and the analytics spec attributes.
 */
const apiAs = <T>(role: E2ERole, path: string, method: string, body?: Record<string, unknown>) =>
    cy.env(['apiUrl']).then(({ apiUrl }) =>
        cy.task<T>('ownerApi', {
            apiUrl: String(apiUrl),
            path,
            method,
            body,
            ...seedAccount(role)
        })
    );

/** The overwhelmingly common case: provisioning needs the account that holds every key. */
const ownerApi = <T>(path: string, method: string, body?: Record<string, unknown>) =>
    apiAs<T>('owner', path, method, body);

/**
 * The deployment's source language for product content — `NODE_FALLBACK_LOCALE` on the paired
 * backend, `en` by default and never overridden in this demo stack (the frontend's own
 * `VITE_APP_FALLBACK_LOCALE` defaults the same way). The write contract requires this locale's
 * entry on every `POST /products` — there is no discoverable-at-runtime source for it here, so
 * this fixture assumes the default the way `PUBLIC_PAGE_SIZE` above assumes the contract's
 * page-size maximum.
 */
const FALLBACK_LOCALE = 'en';

Cypress.Commands.add('createProduct', (overrides: Record<string, unknown> = {}) => {
    // Callers may override `translations` wholesale (a multi-language fixture) or just pass a
    // flat `title`, which is folded into the fallback locale's entry below — the shape most
    // specs actually want to write.
    const { title, translations, ...rest } = overrides;
    return ownerApi<ProductLike>('/products', 'POST', {
        price: 10,
        ...rest,
        translations: translations ?? {
            [FALLBACK_LOCALE]: {
                // Unique per test, so a title assertion cannot pass on a row some other case
                // created.
                title:
                    title ?? `e2e ${asStub<CypressWithRunnableState>(Cypress).state('runnable').id}`
            }
        }
    });
});

Cypress.Commands.add('softDeleteProduct', (id: string) =>
    ownerApi<null>(`/products/${id}`, 'DELETE')
);

/*
 * `PATCH` merges: unlike the `PUT` this replaced, a body naming only `active` leaves everything
 * else — including every language — exactly as it was.
 */
Cypress.Commands.add('deactivateProduct', (product: ProductLike) =>
    ownerApi<null>(`/products/${product.id}`, 'PATCH', { active: false })
);

Cypress.Commands.add('subjectOrder', (name: string) =>
    cy.subjectId(name).then((id) => ownerApi<OrderLike>(`/orders/${id}`, 'GET'))
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

Cypress.Commands.add('createWebhookSubscription', (overrides: Record<string, unknown> = {}) =>
    ownerApi<WebhookSubscriptionLike>('/webhooks/subscriptions', 'POST', {
        // Unique per test, so two specs creating one in the same run never collide on the SSRF
        // guard's DNS resolution for the same host.
        url: `https://example.com/hook-${asStub<CypressWithRunnableState>(Cypress).state('runnable').id}`,
        eventTypes: ['order.created'],
        ...overrides
    })
);

Cypress.Commands.add('mintApiKey', (overrides: Record<string, unknown> = {}) =>
    ownerApi<ApiKeyLike>('/api-keys', 'POST', {
        // Unique per test; `products.read` is a real declared tenant key the e2e owner
        // (`all.manage`) holds — an invented string is a 422, mint's own floor.
        name: `e2e ${asStub<CypressWithRunnableState>(Cypress).state('runnable').id}`,
        permissions: ['products.read'],
        ...overrides
    })
);
