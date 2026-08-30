# tests/support/e2e/fixtures.ts

## Purpose

Cypress custom commands that locate or create demo-dataset records by **role** (e.g. "inStock", "rich") instead of by a backend-specific id or title. This keeps specs portable across backends: the shared contract treats `Id` as format-free, so naming a concrete record in a spec would adopt a constraint the contract deliberately avoided.

## Key elements

- **`ProductRole`** (`'inStock' | 'rich' | 'outOfStock'`) and **`ROLE_PREDICATES`** — maps each role to a boolean predicate over a `ProductLike` shape, defining what "in stock", "fully populated", and "zero stock" mean.
- **`ProductLike`** — a six-field structural interface (id, title, price, onHand, description, categories). Declared locally rather than imported from `@api` because `tsconfig.cypress.json` is a composite project that does not claim `contracts/`.
- **`publicProducts()`** — reads the anonymous `GET /products?pageSize=100` list via `cy.request`.
- **`productInRole(role)`** — finds the first public product satisfying the role's predicate; throws a descriptive error if the dataset has none.
- **`orderInRole('cancellable')`** — finds the admin's own order with `status === 'pending'` (the cancel-gate-open state), read as admin.
- **`accountInRole(role)`** — calls `GET /account` as the given `E2ERole` to resolve the caller's id/email from the API rather than hardcoding them.
- **`createProduct(overrides?)`** — `POST /products` as admin; defaults title to a test-run-unique string and price to 10.
- **`softDeleteProduct(id)`** — `DELETE /products/{id}` as admin (sets `deletedAt`).
- **`deactivateProduct(product)`** — `PUT /products/{id}` as admin with `active: false`.
- **`apiAs<T>` / `adminApi<T>`** — internal helpers that route write (and role-scoped read) calls through `cy.task('adminApi')` on the Node side, passing credentials from `E2E_ACCOUNTS`.

## Relationships

- **`tests/support/e2e/accounts.ts`** — provides `E2E_ACCOUNTS` (credential map keyed by `E2ERole`) and the `E2ERole` type; `apiAs` and `accountInRole` consume both to authenticate role-scoped API calls.
- **`tests/support/e2e/e2e.ts`** — the Cypress support entry point that imports this file so the custom commands are registered before specs run.

## Notes

- **Write path is Node-side, not browser-side.** All mutations (`createProduct`, `softDeleteProduct`, `deactivateProduct`) and role-scoped reads (`accountInRole`, `orderInRole`) go through `cy.task('adminApi')`. This avoids the Pinia-store token and refresh-cookie side-effects that a `cy.request` login would leave behind, which session-counting and analytics specs would observe.
- **`deactivateProduct` requires `title` and `price` in the body.** The update route is replace-not-patch; omitting them yields a 422. The command passes the product's existing values forward.
- **`createProduct` titles are unique per test run** (`e2e <runnable id>`), preventing a title-based assertion from matching a row another spec created.
- **`orderInRole` matches `userId === account.id`.** This deliberately scopes to the admin's own orders (not all orders), because "cancel then rebuy" is an action on your own order.
- **`PUBLIC_PAGE_SIZE = 100`** is the contract maximum, not a default, because a backend may seed more rows than one default page would return.
- **`productInRole` and `orderInRole` throw on no-match** rather than skipping — a dataset missing a role means the branch is untested and the failure should be loud.
