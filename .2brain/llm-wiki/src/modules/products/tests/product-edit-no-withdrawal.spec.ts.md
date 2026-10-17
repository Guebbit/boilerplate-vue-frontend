---
source: src/modules/products/tests/product-edit-no-withdrawal.spec.ts
sha256: 0320f32245e38bb812df01e7f94abc5b13dbe23b26b2c8c2524087cda604aaf6
generated_at: 2026-10-17T01:31:35.117462+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-no-withdrawal.spec.ts

## Purpose

Verifies that the `noWithdrawal` flag (EU Art. 16 consumer-protection field) round-trips through the ProductEdit form: it hydrates from the admin record, is always present in the PATCH body (explicitly `true` or `false`, never omitted), and the sent shape is validated against the OpenAPI contract's own `UpdateProductByIdBody` schema so drift fails here.

## Key elements

- **`mountHydrated(adminRecord)`** – Mounts `ProductEdit` with a mocked `orvalMutator`, resolves locales first, then the admin record, using two `deferred` promises to enforce strict sequencing. Returns the settled Vue wrapper.
- **`lastPatch()`** – Walks the mocked `orvalMutator` call log via `findLast` to extract the single PATCH config; throws if no PATCH was issued.
- **`echo(body)`** – Spreads caller fields over a minimal valid product (`id`, `title`, `price`, `currency`, `translations`) so the post-submit reload has a legal shape.
- **`deferred<T>()`** – Returns `{ promise, resolve }`; used to control the timing of the two GET responses independently.
- **`LOCALES_RESPONSE`** – Static fixture: one active locale (`en`) so the i18n / tab-bar initialization succeeds.
- **`describe('ProductEdit — noWithdrawal round-trip')`** – Two cases:
  - Excluded product (`noWithdrawal: true`) → field renders, PATCH body (validated via `contractRequest`) matches `{ noWithdrawal: true }`.
  - Ordinary product (no field in admin record) → PATCH body still carries `noWithdrawal: false`.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The component under test; mounted with `id: 'p1'` and driven to a hydrated, submittable state.
- **`src/infrastructure/http/index.ts`** – Source of `orvalMutator`, which is fully mocked (`vi.mock`) so all HTTP goes through the test's promise queue.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the product module's Pinia stores and routes before any mount occurs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `parseOrvalFixture` (builds a valid orval response envelope), `orvalEnvelope` (wraps a payload), and `contractRequest` (validates a request body against the generated schema).

## Notes

- **Sequencing matters:** the admin-record promise must resolve *after* the locales promise, or the tab bar never opens and the form stays inert. The `deferred` helper exists solely for this; it is duplicated (not imported) from `product-edit-locale-race.spec.ts` by design.
- **Always PATCH, never PUT:** the form's submit path is hardcoded to PATCH; the `lastPatch` helper filters on `config.method === 'PATCH'` (uppercase, matching the generated orval client).
- **Schema-validated assertion:** the first test doesn't just check a field; it runs the entire PATCH body through `contractRequest(schemas.UpdateProductByIdBody, …)`, so any extra/missing/mis-typed property fails the spec.
- **Mock reset per test:** `beforeEach` calls `mockReset()` on `orvalMutator`, so each test case starts with zero prior calls.
