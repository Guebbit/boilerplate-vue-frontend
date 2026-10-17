---
source: src/modules/products/tests/product-edit-tax-class.spec.ts
sha256: ad32d2f361f87e22f1b5dfa204b1bbca487057eb86f9a4a1ed7bd072c1be377b
generated_at: 2026-10-17T01:32:24.167748+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-tax-class.spec.ts

## Purpose

Verifies that the `ProductEdit` form correctly round-trips the `taxClass` field: it hydrates the value from the admin record (including the "shop default" case represented as an explicit `null`), and resends it unchanged on submit via PATCH. The sequencing of locale-resolution before admin-record-loading mirrors the setup in `product-edit-locale-race.spec.ts`.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope to register product routes into the kernel so the memory router can resolve `/en/products/p1/edit`.
- **`router`** — a `createMemoryHistory` router carrying the real `collectModuleRoutes(enabledModules)` tree; gives the SUT a working navigation target.
- **`LOCALES_RESPONSE`** — static fixture for `GET /locales`; declares a single active locale `en`.
- **`deferred<T>()`** — returns `{ promise, resolve }` so the test can resolve the locales and admin endpoints in a controlled order (admin strictly after locales).
- **`echo(body)`** — builds a minimal valid product envelope (`id`, `title`, `price`, `currency`, `translations`) merged with the given field overrides; used as the PATCH response payload.
- **`lastPatch()`** — inspects the mocked `orvalMutator` calls, finds the last one with `method: 'PATCH'`, and returns its config; throws if no PATCH was sent.
- **`mountHydrated(adminTaxClass)`** — mounts `ProductEdit`, wires the mock to serve locales/admin/PATCH in sequence, resolves them with two `flushPromises()` cycles, and returns the fully hydrated wrapper.
- **`describe('ProductEdit — taxClass round-trip')`** — two cases: (1) a rated product (`taxClass: 'reduced'`) is resubmitted unchanged; (2) a product with no tax class hydrates the field as `null` and resubmits `null`.

## Relationships

- **`src/infrastructure/http/index.ts`** — mocked entirely (`vi.mock`); the spec asserts against `orvalMutator` call arguments to verify the PATCH body.
- **`src/modules/products/views/ProductEdit.vue`** — the system under test; imported, mounted, and driven (form submit, field assertions).
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which registers module routes so the memory router can navigate to the edit path.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` and `parseOrvalFixture` to shape HTTP responses in the exact envelope/fixture format the generated client expects.

## Notes

- The deferred-promise pattern is duplicated from `product-edit-locale-race.spec.ts`; the admin record **must** resolve after locales, or the tab bar never opens and subsequent assertions fail.
- `taxClass: null` on the wire is the explicit "shop default" value — it is **not** an omitted key. The only field exempt from this rule is `translations`, which receives a PATCH merge exception.
- The form always issues **PATCH** (never PUT). `lastPatch()` filters by `method === 'PATCH'` (uppercase, matching the generated client) to locate the relevant call.
- `parseOrvalFixture` does a case-insensitive method lookup internally, so the mock can use the same fixture constants regardless of the case used in the config assertion.
