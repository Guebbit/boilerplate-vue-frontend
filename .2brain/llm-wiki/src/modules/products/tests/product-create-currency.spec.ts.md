---
source: src/modules/products/tests/product-create-currency.spec.ts
sha256: 81c4f2080af5fa419b853f43939dc40abf3d9a4d0119594f62c47dc7f60dfdb0
generated_at: 2026-10-17T01:30:21.333511+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-currency.spec.ts

## Purpose

Verifies that the **ProductCreate** price input (`VNumberInput`) derives its decimal precision from the shop's own currency code (`GET /shop`) rather than from a pre-existing product. Because a create form has no product to read `currency` from, the shop entity is the sole source of truth for how many decimal places the operator must type (JPY → 0, EUR → 2, KWD → 3).

## Key elements

- **`shopCurrencyCode`** (module-level `let`) — controls the `currency` field in the `GET /shop` mock response; mutated per-test-case.
- **`mountCreate()`** — mounts `ProductCreate` with the real router, Vuetify plugin, and i18n instance.
- **`pricePrecision(wrapper)`** — reads the `precision` prop off the rendered `VNumberInput` component.
- **`beforeEach`** — resets the shop fixture, creates a fresh Pinia instance, stubs `orvalMutator` to answer `/locales`, `/shop`, and `POST /products` with schema-parsed orval fixtures, then navigates the memory-history router to `/en/products/new`.
- **`describe` / `it.each`** — parameterised table (EUR/2, JPY/0, KWD/3) asserting `precision`, plus a single test asserting the currency code appears in the `[data-test=product-price-field]` label.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a `vi.fn()` so every HTTP call is intercepted before the real transport.
- **`wireModulesIntoCore()`** (imported at module top-level) — registers enabled product-module routes into the kernel registry so `collectModuleRoutes` picks them up for the router.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** — the component under test; this spec mounts it and inspects its rendered `VNumberInput`.
- **`tests/support/unit/fixtures.ts`** — supplies `aShop({ currency })`, a factory that builds a minimal shop fixture with an overridable currency code.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore()`, called once at import time to populate the module route registry used by `collectModuleRoutes`.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wraps a payload in the API envelope shape) and `parseOrvalFixture` (validates the envelope against the Orval-generated schema before returning it), ensuring mock responses stay schema-conformant.

## Notes

- The test uses **three chained `flushPromises()` calls** rather than `await` to allow the full render → data-fetch → reactive-update pipeline to settle; adding a new async stage (e.g. another API call in the component) will require an additional `.then(flushPromises)` hop.
- `shopCurrencyCode` is reset to `'EUR'` in `beforeEach` and then overwritten per-case; tests are order-independent but rely on the variable being the *sole* driver of the shop's currency in the mock.
- The mock implementation branches on `config.url` for GETs and `config.method === 'POST'` for the create call; if the component gains a new endpoint, the fallback `orvalEnvelope()` (empty envelope) will be returned silently—add an explicit branch to catch unintended requests.
