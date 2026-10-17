---
source: src/modules/products/tests/product-create-tax-class.spec.ts
sha256: cfcd507b408abb51e9423a357b3987d24cd55ff2977d734ab22a1c9d944ceacd
generated_at: 2026-10-17T01:31:10.508160+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-tax-class.spec.ts

## Purpose

Unit test verifying that the **ProductCreate** form renders a `taxClass` field and, when the user leaves it at the shop default, the submitted payload contains the key as `undefined` (i.e. the key is omitted after JSON serialization) rather than explicitly `null`. This pins the create-form contract that distinguishes it from the edit form's "clear to `null`" behaviour.

## Key elements

- **`lastPost()`** – Scans `orvalMutator` mock calls for the most recent `method: 'POST'` and returns its config; throws if none was made.
- **`mountCreate()`** – Mounts `ProductCreate.vue` with the shared memory-history router, Vuetify, and i18n plugins.
- **`beforeEach`** – Resets the Pinia instance, re-mocks `orvalMutator` (resolving `GET /locales` and `POST /products` via `parseOrvalFixture`/`orvalEnvelope`), loads the `en` locale, and navigates to `/en/products/new`.
- **`router`** – A `createMemoryHistory` router carrying real module routes collected from `collectModuleRoutes(enabledModules)`.
- **`LOCALES_RESPONSE`** – Fixture shape for a single active English locale.
- **`describe › 'shows the field and omits the key when left at shop default'`** – The single test: asserts the `data-test=product-tax-class-field` element exists, fills the title, submits the form, then asserts `lastPost().data.taxClass` is `undefined`.

## Relationships

- **`src/infrastructure/http/index.ts`** – Mocked via `vi.mock('@/infrastructure/http')`; the test's `orvalMutator` spy intercepts every HTTP call the component makes.
- **`src/modules/products/views/ProductCreate.vue`** – The component under test; imported and mounted directly.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so that `collectModuleRoutes` and the router pick up product-module route definitions.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` and `parseOrvalFixture` to build valid, schema-checked mock responses for `orvalMutator`.

## Notes

- The test asserts `undefined`, **not** `null`, because the create form has no prior value to clear. The comment makes explicit that JSON serialisation is what drops the key on the wire; the assertion targets the in-memory value that triggers that drop.
- Multiple chained `flushPromises()` calls are required: locale loading → router resolution → Vuetify/i18n hydration → form render. Omitting any of them causes the assertion to run before the component is interactive.
- `vi.mocked(orvalMutator).mock.calls.findLast` relies on the ES2023 `Array.prototype.findLast` (or a polyfill); it is used instead of `[].reverse()[0]` to keep the "no POST" error case explicit.
- The generated Orval client sends `method` in **uppercase** (`'POST'`), which is why `lastPost` and the mock implementation compare against uppercase strings.
