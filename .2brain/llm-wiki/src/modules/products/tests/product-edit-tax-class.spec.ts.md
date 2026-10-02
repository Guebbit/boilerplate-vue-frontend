---
source: src/modules/products/tests/product-edit-tax-class.spec.ts
sha256: d6acba96422addb0bf453152807a3911bcbb6f229bb34a7b8ee93bf5928badc7
generated_at: 2026-10-02T15:37:24.003771+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-tax-class.spec.ts

## Purpose

Verifies that the `ProductEdit` view round-trips the `taxClass` field correctly: it hydrates the value from the admin record (including the explicit `null` "shop default" case) and resends it unchanged on form submit via PATCH. This is a single-field regression guard for PL-72.

## Key elements

- **`mountHydrated(adminTaxClass)`** — Mounts `ProductEdit`, resolves the `/locales` deferred response, flushes, then resolves the `/products/p1/admin` deferred response with the given `taxClass`. Returns a fully hydrated Vue wrapper with tabs open.
- **`lastPatch()`** — Walks `orvalMutator` mock calls with `findLast`, filters for `method === 'PATCH'`, and returns the axios config object (used to inspect `data.taxClass`). Throws if no PATCH was sent.
- **`deferred<T>()`** — Manual `{ promise, resolve }` pair used to control the order in which the locales and admin responses land.
- **`echo(body)`** — Spreads a partial object over a minimal valid product record (`id`, `title`, `price`, `currency`, `translations`) so the post-submit reload has a parseable response.
- **`LOCALES_RESPONSE`** — Static fixture for the `/locales` endpoint (single `en` locale).
- **Two test cases** — (1) a product with `taxClass: 'reduced'` resends `'reduced'`; (2) a product with no `taxClass` key resends explicit `null` (not an omitted key).

## Relationships

- **`src/infrastructure/http/index.ts`** — Imports `orvalMutator` (mocked via `vi.mock`) and asserts against the PATCH config it receives. All HTTP traffic in this spec goes through this mock.
- **`tests/support/unit/wire-modules.ts`** — Calls `wireModulesIntoCore()` at module scope so the product module's routes, stores, and i18n keys are registered before the router is built.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `parseOrvalFixture` (wraps a fixture in the orval response envelope) and `orvalEnvelope` (default empty envelope) used to shape every mock return value.

## Notes

- **Sequencing matters:** The locales response must resolve *before* the admin record; otherwise the tab bar never opens and the form never hydrates. This mirrors `product-edit-locale-race.spec.ts`.
- **PATCH, not PUT:** The form always sends PATCH. The generated client uses uppercase `method: 'PATCH'`, so `lastPatch` matches on the uppercase string rather than relying on `parseOrvalFixture`'s case-insensitive lookup.
- **Explicit `null` vs. omitted key:** Only `translations` receives a PATCH merge exception; every other field (including `taxClass`) must be present in the body. The second test asserts `toBeNull()`, not absence.
- **`data-test` selector:** The tax-class field is located via `[data-test=product-tax-class-field]`; the test asserts it exists even when the value is `null`.
