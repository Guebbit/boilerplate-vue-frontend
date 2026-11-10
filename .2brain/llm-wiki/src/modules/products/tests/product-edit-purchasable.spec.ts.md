---
source: src/modules/products/tests/product-edit-purchasable.spec.ts
sha256: be2a66f99aa5106dd64fe8549977fd2a84057430c45cb3597d35dac5250e87f4
signature: ea5d9783af1377258a4560fd3554162756e423f0dff0337c2690ff0eb36fb6ab
generated_at: 2026-11-10T05:27:14.476009+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-purchasable.spec.ts

## Purpose

Verifies that the ProductEdit form correctly round-trips the `purchasable` flag: it hydrates the field from the admin record, includes it on every PATCH submission, and validates the outgoing body against the generated contract schema (`UpdateProductByIdBody`) so that any drift in the sent payload is caught here.

## Key elements

- **`mountHydrated(adminRecord)`** — mounts `ProductEdit`, drives locale and admin-record resolution in a strict order (locales first, then the record), and returns a fully hydrated, tab-open wrapper. Uses the `deferred` helper to control timing.
- **`lastPatch()`** — pulls the most recent `orvalMutator` call whose config has `method === 'PATCH'` (case-sensitive, matching the generated client's uppercase convention) and returns its config.
- **`echo(body)`** — builds a minimal valid product object for the post-PATCH reload response.
- **`deferred<T>()`** — returns a `{ promise, resolve }` pair so the spec can settle endpoints on its own schedule.
- **Three test cases** — (1) off-sale record (`purchasable: false`) is hydrated and resended as `false`, validated via `contractRequest`; (2) on-sale record sends `true` explicitly; (3) a record *without* the flag defaults to `true` on submission.
- **`wireModulesIntoCore()`** — registers all enabled modules in the kernel before tests run.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** — the system under test; mounted with router, vuetify, and i18n plugins.
- **`src/infrastructure/http/index.ts`** — the spec imports `orvalMutator` from this module and stubs it to intercept outgoing requests, then inspects the recorded PATCH call to assert the body.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (deserializes endpoint fixtures into concrete response objects) and `contractRequest` (validates a payload against a generated Zod schema).
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore` to connect the module registry to the kernel before mounting.

## Notes

- The form always sends **PATCH**, never PUT. The generated client emits the method uppercase (`'PATCH'`); `lastPatch()` matches that exact case, whereas `parseOrvalFixture` uses a case-insensitive lookup internally.
- The `deferred` pattern (locales resolve before the admin record) is required because the tab bar only opens after both responses land — the same constraint documented in `product-edit-locale-race.spec.ts`.
- Mounting setup mirrors `product-edit-no-withdrawal.spec.ts`; keep the two in sync if the bootstrap sequence changes.
- The contract-schema validation in test 1 (`contractRequest(schemas.UpdateProductByIdBody, …)`) is the guard that fails if the form silently stops sending `purchasable` or renames it.
