# tests/support/e2e/fixtures.ts

## Purpose

Defines a set of Cypress custom commands that give specs a **role-based** way to find or create test subjects (products, orders, accounts) without hard-coding backend-specific IDs or titles. The design principle: a spec names *what it needs* (e.g. "an in-stock product", "a cancellable order") and the file resolves that against the running backend at runtime, keeping specs portable across backends.

## Key elements

- **`ProductRole`** (`'inStock' | 'rich' | 'outOfStock'`) — the three product shapes specs may request; each maps to a predicate in `ROLE_PREDICATES`.
- **`ROLE_PREDICATES`** — `Record<ProductRole, (p: ProductLike) => boolean>`; `inStock` checks `onHand > 0`, `rich` requires all optional fields populated, `outOfStock` checks `onHand === 0`.
- **`publicProducts()`** — walks every page of the public catalogue (up to `PUBLIC_PAGE_SIZE = 100` per request) and returns the full item list. Uses `cy.request` as an anonymous caller.
- **`productInRole(role)`** — calls `publicProducts()` then finds the first match; throws a descriptive error if no product satisfies the role.
- **`createProduct(overrides?)`** — `POST /products` as admin via the `adminApi` task; defaults to a minimal body with a run-unique title.
- **`softDeleteProduct(id)`** — `DELETE /products/{id}` (sets `deletedAt`).
- **`deactivateProduct(product)`** — `PUT /products/{id}` with `active: false`; must include `title` and `price` because the update route is a full replace.
- **`accountInRole(role)`** — `GET /account` as the named seeded user; returns `{ id, email }`.
- **`createOrder(role)`** — provisions a new product then creates a one-line order under the named account's ID, all as admin.
- **`orderInRole('cancellable')`** — reads the admin's own orders and returns the first with `pending` status.
- **`apiAs` / `adminApi`** — internal helpers that route write/read calls through the `adminApi` Cypress task (Node-side) rather than `cy.request`, passing credentials from `E2E_ACCOUNTS`.

## Relationships

- **`tests/support/e2e/accounts.ts`** — imports `E2E_ACCOUNTS` and the `E2ERole` type; supplies the seeded credential pairs used by `apiAs`, `accountInRole`, and `createOrder`.
- **`tests/support/e2e/e2e.ts`** — the other support file in the same directory; the `adminApi` task it references (`cy.task('adminApi', …)`) is registered there, making this file's write commands dependent on that task existing.

## Notes

- `ProductLike` is a **structural** local interface (six fields), deliberately not imported from `@api`, because `tsconfig.cypress.json` is a composite project that does not include `contracts/`.
- All reads (`publicProducts`, `productInRole`) use the **public** (anonymous) product list — no login, no admin token — so they cannot disturb session cookies or analytics state that other specs assert on.
- All writes go through the **`adminApi` Node task** (not `cy.request`) because the app stores its access token in a Pinia store; a browser-side admin call would leave a refresh cookie behind, breaking session-counting and analytics specs.
- `createProduct` titles are made unique per test run via `Cypress.state('runnable').id` so title assertions cannot accidentally match a row created by a prior spec.
- `deactivateProduct` must send `title` and `price` alongside `active: false` — the update endpoint is a full replace, not a patch; omitting required fields yields a 422.
- `orderInRole` is restricted to the **admin's own** orders (not staff's view of all orders), because the cancel-then-rebuy flow is an action on your own order.
