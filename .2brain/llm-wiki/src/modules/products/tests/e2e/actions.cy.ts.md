---
source: src/modules/products/tests/e2e/actions.cy.ts
sha256: 15aedf5f0b76fba422b67c437000a6a485815048fa41897fb94161f02079e2c6
signature: 15aedf5f0b76fba422b67c437000a6a485815048fa41897fb94161f02079e2c6
generated_at: 2026-11-10T05:22:40.363173+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/actions.cy.ts

## Purpose

E2E test suite for the products module that exercises failure-recovery behaviour of every write action (create, edit, delete) plus the slow-load path. Each scenario stubs the relevant server call to fail, asserts the UI shows the expected error alert while preserving user-typed state, then confirms a retry succeeds once the stub is removed.

## Key elements

- **`actionTable('products', [...])`** — single call that registers four test-case objects with the shared runner; no other exports.
- **Create-failure case** (`kind: 'form'`) — navigates to `/en/products/create`, types a title and price, submits, expects alert `product-create-submit-error`.
- **Edit-failure case** (`kind: 'form'`) — resolves a product ID via `cy.subjectId('product.inStock')`, changes the price, submits, expects alert `product-edit-submit-error`.
- **Delete-failure case** (`kind: 'row'`) — clicks row-delete + confirm dialog on the list page, expects alert `products-list-row-action-error` and checks the row selector `[data-test=list-row]` is still present.
- **Slow-read case** (`kind: 'slow'`) — intercepts the GET for the edit route to delay resolution, asserts the form stays closed until data lands, then a refetch preserves the typed value.

Each case object carries: `name`, `persona` (always `'editor'`), `route` (static string or `cy.subjectId` callback), `prepare`, `trigger`, `intercept` (`method`, `url` glob, `operation`), `kind`, `alert`, `message`, and case-specific extras (`listed`, `field`, `typed`).

## Relationships

- **`tests/support/e2e/action-table.ts`** — provides the `actionTable` runner function imported at the top. This file is purely declarative: it passes the case array to the runner, which handles navigation, stub setup/teardown, alert assertions, retry logic, and `kind`-specific DOM expectations. All runtime Cypess behavior lives in the runner.

## Notes

- `route` can be a string **or** a `() => Promise<string>` callback (used when a dynamic ID is needed via `cy.subjectId`). The runner must handle both shapes.
- `intercept.url` uses a glob pattern (`**/products`) while `intercept.operation` is a REST-style identifier (`/products`, `/products/{id}`). Both are passed to the runner for stub matching.
- The `kind` field (`'form' | 'row' | 'slow'`) controls which recovery assertions the runner performs; it is not a test framework concept.
- Selectors in `prepare`/`trigger` use `data-test` attributes scoped within `#translation-panel-en` or the form context — they are coupled to the product form markup and will break if those attributes are renamed.
