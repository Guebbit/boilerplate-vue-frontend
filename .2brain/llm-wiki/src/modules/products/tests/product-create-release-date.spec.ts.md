---
source: src/modules/products/tests/product-create-release-date.spec.ts
sha256: 340bafc2da705ed4e004de2888d1d04758e743eb4062d5e99c1c1649508a8f57
generated_at: 2026-10-17T01:30:58.010594+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-release-date.spec.ts

## Purpose

Unit-test spec for the `ProductCreate` form's release-date field. It verifies two contract rules for the create endpoint: a user-entered date is serialised as an ISO-8601 instant in the POST body, and an empty field omits the `releaseDate` key entirely (the create body schema accepts no `null`).

## Key elements

- **`submitCreate(releaseDate?)`** — End-to-end form helper: mounts `ProductCreate`, sets the title, optionally types a `datetime-local` value into the release-date input, triggers form submit, and returns the `data` object captured from the last POST on the mocked `orvalMutator`.
- **`lastPost()`** — Scans `orvalMutator` mock calls for the most recent `method === 'POST'` entry and returns its config; throws if none was made.
- **`mountCreate()`** — Mounts `ProductCreate` with the shared router, Vuetify, and i18n plugins.
- **`beforeEach`** — Resets Pinia, resets and re-implements the `orvalMutator` mock (handles `GET /locales` and `POST /products` via `parseOrvalFixture`), and navigates the memory-history router to `/en/products/new`.
- **Two `it` blocks** under `describe('ProductCreate — release date')`: one asserts `data.releaseDate === new Date(2027, 2, 15, 9, 30).toISOString()`; the other asserts `data.releaseDate` is `undefined`.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** — The component under test; imported and mounted in every case.
- **`src/infrastructure/http/index.ts`** — Source of the `orvalMutator` function; immediately mocked via `vi.mock('@/infrastructure/http', …)` so no real HTTP occurs.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register module routes/dependencies in the kernel before the router is created.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `orvalEnvelope` and `parseOrvalFixture` used inside the mock implementation to produce schema-valid API responses.

## Notes

- The first test compares against `new Date(2027, 2, 15, 9, 30).toISOString()`, which is **local-timezone dependent**: the expected value shifts if the test runner's TZ changes. The form presumably stores the local wall-clock and the test round-trips it, but CI environments with different TZ settings will produce a different ISO string.
- The mock uses `Array.prototype.findLast` on `mock.calls`, relying on Node ≥ 18 / a polyfill.
- Three consecutive `flushPromises()` calls before form interaction are needed to let router resolution, i18n loading, and Vuetify's internal async setup all settle.
- The file lives under `src/modules/products/tests/` (a sibling of `views/`) rather than under the repo-root `tests/` directory, so relative imports to shared helpers use `../../../../tests/…`.
