---
source: src/modules/products/tests/product-create-tax-class.spec.ts
sha256: c3e6e3fdd073cf786d0213cfe6335ff489931228dde710178dd5e57016172d01
signature: 373fc7729ef0dbec4e05423499335eb069cbbdba69911c7ca28a3dab3e25c447
generated_at: 2026-11-10T05:25:59.706713+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-tax-class.spec.ts

## Purpose

Unit tests for the `ProductCreate` form that verify two wire-level contracts: (1) when `taxClass` is left at its shop default the key is omitted from the POST body (value stays `undefined`, unlike the edit form which sends explicit `null`), and (2) the create request carries an `Idempotency-Key` header so a network retry cannot duplicate a product.

## Key elements

- **`lastPost()`** – Scans the mocked `orvalMutator` call history for the most recent entry whose `config.method === 'POST'` and returns that config object. Throws if no POST was made.
- **`mountCreate()`** – Mounts `ProductCreate.vue` with the real memory-history router, Vuetify, and i18n plugins.
- **`beforeEach` hook** – Resets Pinia, mocks `orvalMutator` to return fixture-shaped responses for `GET /locales` and `POST /products` (via `parseOrvalFixture`), loads the `en` locale, and navigates the router to `/en/products/new`.
- **`describe('ProductCreate — taxClass')`** – Asserts the tax-class field is rendered (`data-test=product-tax-class-field`) and that `lastPost().data.taxClass` is `undefined` after submit.
- **`describe('ProductCreate — idempotency key')`** – Asserts the POST call's second argument (`headers`) contains an `Idempotency-Key` property.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a spy so no real HTTP occurs.
- **`wireModulesIntoCore()`** – Registers enabled modules into the kernel for the test environment.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** – The component under test; imported and mounted directly.
- **`src/infrastructure/http/index.ts`** – Its `orvalMutator` export is the sole HTTP seam; fully mocked here so assertions can inspect request config/headers.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `parseOrvalFixture`, used to shape mock responses into the same structure the generated orval client would emit.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, called once at module scope to make the product module's routes/store available to the test router and Pinia.

## Notes

- The tax-class assertion intentionally checks for `undefined` (not `null`). The file header comment clarifies that JSON serialization is what actually drops the key on the wire; the test asserts the JS value that triggers that drop.
- The orval-generated client sends `method` in **uppercase** (`'POST'`), so both `lastPost()` and the mock implementation match on the uppercase string.
- Multiple chained `flushPromises()` calls (often three in a row) are needed because the test waits for async locale loading, reactive component updates, and the router to settle.
- The idempotency-key assertion reads `post?.[1]?.headers` (the **second** argument to `orvalMutator`), not the first config object—consistent with how the generated client passes headers separately.
