---
source: src/modules/products/tests/product-edit-no-withdrawal.spec.ts
sha256: 2a44f3e48a3fc8d1ce5be9d32ebbea92e848d2b171c0aa8d4ffad4835d7db251
signature: ea5d9783af1377258a4560fd3554162756e423f0dff0337c2690ff0eb36fb6ab
generated_at: 2026-11-10T05:26:51.961346+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-no-withdrawal.spec.ts

## Purpose

Verifies that the `ProductEdit` form correctly round-trips the `noWithdrawal` flag (EU Art. 16): it is hydrated from the admin record and re-sent on every PATCH. The outgoing body is validated against the generated contract schema (`UpdateProductByIdBody`) so that any drift between what the form sends and what the API expects fails here.

## Key elements

- **`mountHydrated(adminRecord)`** – Mounts `ProductEdit` with a mocked `orvalMutator`, resolves locales then the admin record on a controlled schedule (via `deferred`), and returns the wrapper in a fully hydrated, tab-open state.
- **`lastPatch()`** – Finds the most recent `orvalMutator` call whose `method` is exactly `'PATCH'` (uppercase, as the generated client sends it) and returns its config.
- **`contractRequest(schemas.UpdateProductByIdBody, data)`** – Imported from `orval-fixture-schema.ts`; asserts `data` conforms to the API's request-body schema before checking field values.
- **`echo(body)`** – Spreads the given fields over a minimal valid product payload so the post-submit reload has a coherent response.
- **Test 1 – "hydrates an excluded product…"** – Loads a record with `noWithdrawal: true`, submits, then asserts the PATCH body contains `noWithdrawal: true` *via schema validation*.
- **Test 2 – "sends false for an ordinary product…"** – Loads a record *without* the field, submits, asserts the PATCH body explicitly contains `noWithdrawal: false` (never omitted).

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The component under test; imported and mounted directly with `props: { id: 'p1' }`.
- **`src/infrastructure/http/index.ts`** – Provides `orvalMutator`, which this spec mocks to intercept outgoing HTTP calls; the test then inspects the mock's call history to read the PATCH body.
- **`tests/support/unit/orval-fixture-schema.ts`** – Imports `parseOrvalFixture` (decodes wire fixtures into objects) and `contractRequest` (validates a payload against a generated schema).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register enabled modules so `collectModuleRoutes` can build the router.

## Notes

- Mounting and sequencing mirror `product-edit-tax-class.spec.ts`; the `deferred` helper and the "locales-before-admin-record" ordering are shared with `product-edit-locale-race.spec.ts` for the same reason (tab bar won't open otherwise).
- The spec asserts the form **always** sends `noWithdrawal` (true or false) and never omits it — the second test exists specifically to guard against a conditional-include regression.
- `lastPatch` uses `findLast` with a strict `=== 'PATCH'` comparison because the generated Orval client upper-cases method names, whereas `parseOrvalFixture`'s internal lookup is case-insensitive.
- References "Q10's answer" in a comment regarding why only PATCH (never PUT) is exercised.
