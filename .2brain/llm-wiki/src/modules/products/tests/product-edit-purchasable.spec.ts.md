---
source: src/modules/products/tests/product-edit-purchasable.spec.ts
sha256: cc9385f725781323b8487f944172dbfb6df138a85993f0d16a3a28845fa37530
generated_at: 2026-10-17T01:31:48.512745+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-purchasable.spec.ts

## Purpose

Vitest spec that verifies the `purchasable` (off-sale) flag round-trips through the ProductEdit form: it is hydrated from the admin record, present in the PATCH body on every submit, and validated against the generated contract's `UpdateProductByIdBody` schema so any drift between what the form sends and what the API expects fails here.

## Key elements

- **`mountHydrated(adminRecord)`** — Mounts `ProductEdit` with a mocked `orvalMutator` that answers `/locales` and `/products/p1/admin` via deferred promises; resolves them in order (locales → flush → admin → flush) to reach a tab-open, fully hydrated state before the test body runs.
- **`lastPatch()`** — Scans the mocked `orvalMutator` call history for the most recent call whose config has `method === 'PATCH'` (uppercase, matching the generated client) and returns its `{ data }`. Throws if no PATCH was issued.
- **`echo(body)`** — Builds a minimal valid admin-record object (id, title, price, currency, translations) spread with the caller's fields; used as the post-submit reload payload so the form doesn't crash.
- **`deferred<T>()`** — Returns `{ promise, resolve }`; lets the test control exactly when each endpoint's response lands.
- **`LOCALES_RESPONSE`** — Static fixture for `GET /locales` (single active `en` locale).
- **Three `it` blocks:**
  - Off-sale record (`purchasable: false`) → field renders, submit → PATCH body matches `{ purchasable: false }` per `contractRequest(schemas.UpdateProductByIdBody, …)`.
  - On-sale record (`purchasable: true`) → PATCH body explicitly contains `purchasable: true`.
  - Record with no `purchasable` key → form defaults to on-sale; PATCH body contains `purchasable: true`.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** — the component under test; mounted directly with `id: 'p1'` prop.
- **`src/infrastructure/http/index.ts`** — fully mocked via `vi.mock`; its `orvalMutator` export is the only HTTP surface the spec interacts with.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the product module's routes and stores before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (parses a fixture into a realistic axios response), `orvalEnvelope` (wraps payloads in the API envelope), and `contractRequest` (validates a request body against a generated schema).

## Notes

- All HTTP is mocked; no real network calls. `orvalMutator` is reset in `beforeEach`.
- Response ordering is enforced manually: locales must resolve **before** the admin record, otherwise the tab bar never opens (same pattern as `product-edit-locale-race.spec.ts`).
- `lastPatch()` filters on the literal string `'PATCH'` because the generated Orval client sends methods in uppercase, whereas `parseOrvalFixture` uses a case-insensitive lookup internally.
- The form always issues PATCH (never PUT); this is a project-wide convention (referenced as "Q10").
- Mounting boilerplate (router with `createMemoryHistory`, `collectModuleRoutes`, vuetify, i18n) mirrors `product-edit-no-withdrawal.spec.ts` and is expected to stay in sync with that file.
