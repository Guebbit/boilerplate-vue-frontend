---
source: src/modules/products/tests/product-edit-no-withdrawal.spec.ts
sha256: b9b0622ce4130d7f280864d3f2916bd2fdbea11cb247bde1b91a64fb411abeda
generated_at: 2026-10-02T15:36:40.811172+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-no-withdrawal.spec.ts

## Purpose

Verifies that the `noWithdrawal` field (EU Art. 16) round-trips through the `ProductEdit` form: it hydrates from the admin record and is always present in the PATCH body (as `true` or `false`, never omitted). The PATCH payload is validated against the generated contract schema (`UpdateProductByIdBody`) so that a drift between what the form sends and what the API contract expects is caught here.

## Key elements

- **`mountHydrated(adminRecord)`** — Mounts `ProductEdit` with deferred promises so locales resolve first, then the admin record; returns the wrapper after both flushes. Replays the exact sequencing the component needs for its tab bar to open.
- **`lastPatch()`** — Scans the mocked `orvalMutator` calls for the last one with `method === 'PATCH'` and returns its axios config (including `data`). Throws if no PATCH was sent.
- **`deferred<T>()`** — Returns `{ promise, resolve }` so the spec can control *when* each HTTP response lands.
- **`echo(body)`** — Spreads a partial over a minimal valid product shape (`id`, `title`, `price`, `currency`, `translations`) to use as the post-submit reload response.
- **Test: "hydrates an excluded product and resends the flag as true"** — Seeds `noWithdrawal: true` in the admin record, submits, then asserts the PATCH body (via `contractRequest` against `schemas.UpdateProductByIdBody`) matches `{ noWithdrawal: true }`.
- **Test: "sends false for an ordinary product, never leaving the flag out"** — Seeds no `noWithdrawal` field, submits, then asserts the PATCH body explicitly contains `noWithdrawal: false`.

## Relationships

- **`src/infrastructure/http/index.ts`** — Entirely mocked (`vi.mock`). The spec replaces `orvalMutator` with a `vi.fn()` whose implementation is swapped per test to route `/locales`, `/products/p1/admin`, and `PATCH` to different deferred/resolved promises.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope before any test runs, registering enabled modules into the app core so route collection and plugin wiring work.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `parseOrvalFixture` (shapes raw JSON into the orval envelope the generated client expects), `orvalEnvelope` (wraps a payload), and `contractRequest` (validates a body object against a generated schema and returns the typed result). All three are used in both the mock implementation and the assertions.

## Notes

- **Sequencing is mandatory:** locales must resolve strictly before the admin record, or the component's tab bar never opens. The `deferred` helper enforces this; it is the same pattern used in `product-edit-locale-race.spec.ts`.
- **Method casing:** `lastPatch()` matches `method === 'PATCH'` (uppercase, as the generated orval client sends it). `parseOrvalFixture` does its own case-insensitive lookup internally, so the two are independent.
- **Always PATCH, never PUT:** The form sends `PATCH` for edits. The spec asserts only the PATCH call; a PUT would go undetected by `lastPatch()` and surface as a thrown error.
- **Schema-validated assertion:** The first test does not just check a raw property — it runs the payload through `contractRequest(schemas.UpdateProductByIdBody, …)`, so a field-name rename or type change in the generated schema fails the test.
- **Mounting mirrors `product-edit-tax-class.spec.ts`:** The component and its plugin/stub setup are intentionally identical; keep them in sync when either spec's harness changes.
