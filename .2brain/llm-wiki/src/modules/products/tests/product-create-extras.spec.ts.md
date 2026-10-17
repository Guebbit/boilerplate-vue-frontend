---
source: src/modules/products/tests/product-create-extras.spec.ts
sha256: 421f171da0b29e011f557166df9df6266ba1bd47046bd9c5c9742965eb4a286f
generated_at: 2026-10-17T01:30:33.599534+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-extras.spec.ts

## Purpose

Verifies the `product-create-extras` slot contract on `ProductCreate`: external modules register an "after create" step that receives the new product ID, and the create POST body stays free of foreign-module fields. This is the integration test for the slot mechanism described in the module doc-comment.

## Key elements

- **`wireModulesIntoCore()`** — called at module top-level; registers all enabled modules into the kernel registry so slot resolution works.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a controllable mock; `beforeEach` routes `/locales` and `POST /products` through `parseOrvalFixture`.
- **`beforeEach`** — fresh Pinia, mock reset, locale load (`en`), router push to `/en/products/new`, `router.isReady()`.
- **`renderExtra`** — tiny render function producing `<span data-test="extra">`, used as the fake extra component's output so the test can assert it mounted.
- **The single `it` block** — defines a fake `Extra` component that calls `registerAfterCreate` in `setup`, mounts `ProductCreate` with the extra injected via the `SLOTS_KEY` provide, fills the title input, submits the form, then asserts:
  - the extra component rendered,
  - the registered step was called exactly once with the created product ID (`'p2'`),
  - the `POST /products` body does **not** contain an `onHand` property.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** — the component under test; mounted here with the slot provided.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called before any test to populate the kernel's module/slot registry.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` and `parseOrvalFixture` so mocked HTTP responses pass the same schema validation used in production.

## Notes

- Three consecutive `flushPromises()` calls after initial mount are required (i18n locale load → router ready → component render); omitting one causes flaky "element not found" errors.
- The test locates the create call with `findLast` because the mock handles multiple requests (locales GET, then products POST); relying on `mock.calls[0]` would grab the locales call.
- The `onHand` assertion encodes the invariant that inventory (or any slot participant) must **not** leak its fields into the product-create payload — it uses its own registered step instead.
- `SLOTS_KEY` is imported from `@/kernel/slots.ts` and used as a symbol in the `provide` map; the key string is always `'product-create-extras'`.
