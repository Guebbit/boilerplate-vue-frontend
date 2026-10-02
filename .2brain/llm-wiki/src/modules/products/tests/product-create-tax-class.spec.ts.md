---
source: src/modules/products/tests/product-create-tax-class.spec.ts
sha256: 4d1907ea258e366d93c66a196637bb61189745b862a73a79fded1f51a460ceb3
generated_at: 2026-10-02T15:35:53.160652+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-tax-class.spec.ts

## Purpose

Vitest unit test for the `ProductCreate` form verifying the PL-72 behavior: when `taxClass` is left at the shop default, the key must be **omitted** from the POST payload (value is `undefined`) rather than sent as an explicit `null` (which is the edit-form convention). Also asserts the field is rendered on screen.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope to register enabled modules into the kernel before any test runs.
- **`vi.mock('@/infrastructure/http', …)`** — replaces the real HTTP layer with a controllable `orvalMutator` mock.
- **`lastPost()`** — scans `orvalMutator.mock.calls` for the most recent call whose `method` is the uppercase string `'POST'` (the orval-generated client convention) and returns its config.
- **`mountCreate()`** — mounts `ProductCreate` with `router`, `vuetify`, `i18n` plugins and a `LayoutDefault` stub.
- **`describe('ProductCreate — taxClass')` / single `it`** — sets a title, submits the form, then asserts (1) `[data-test=product-tax-class-field]` exists and (2) `lastPost().data.taxClass` is `undefined`.

## Relationships

- **`src/infrastructure/http/index.ts`** — the module under mock. Its exported `orvalMutator` is the sole HTTP entry point the component calls; the test replaces it entirely.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which populates the module registry so `collectModuleRoutes(enabledModules)` and the `ProductCreate` route resolve correctly.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` and `parseOrvalFixture` used to build structurally valid API response objects for the `orvalMutator` mock (locales list, product create response).

## Notes

- The assertion targets `undefined`, **not** `null`. This is the deliberate distinction from the edit form; JSON serialization is what actually strips the key on the wire.
- `lastPost()` matches `method === 'POST'` (uppercase) because the generated orval client sends methods in upper-case. A lowercase check would silently fail.
- Multiple chained `.then(flushPromises)` calls are needed to let Vue's reactive updates, i18n locale loading, and async form submission all settle before assertions run.
- The mock implementation keys on `config.url === '/locales'` vs `config.method === 'POST'`; any other call falls through to an empty `orvalEnvelope()`.
