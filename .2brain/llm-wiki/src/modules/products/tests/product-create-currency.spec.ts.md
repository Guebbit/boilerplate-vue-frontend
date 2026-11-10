---
source: src/modules/products/tests/product-create-currency.spec.ts
sha256: a349ef03c2afb37686e346e0a2c660251148f911a008fa5611dbf539ee29c3f9
signature: 373fc7729ef0dbec4e05423499335eb069cbbdba69911c7ca28a3dab3e25c447
generated_at: 2026-11-10T05:25:02.705044+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-currency.spec.ts

## Purpose

Verifies that the ProductCreate form submits the price string formatted to the shop's declared decimal places (`minorUnits` from `GET /shop`), covering zero-place (JPY), two-place (EUR), and three-place (KWD) currencies. This guards the rule that a *new* product has no pre-existing record to inherit formatting from, so the shop's own settings are the sole source of truth.

## Key elements

- **`mountCreate`** – Mounts `ProductCreate` with the real router (memory history), Vuetify, and i18n plugins.
- **`lastPost`** – Scans the mocked `orvalMutator` call log for the most recent `method: 'POST'` invocation and returns its config; throws if none was sent.
- **`beforeEach`** – Resets the shop fixture, Pinia, and the `orvalMutator` mock; wires mock responses for `GET /locales`, `GET /shop` (parameterised via `shopCurrencyCode` / `shopMinorUnits`), and `POST /products`; then navigates the router to `/en/products/new`.
- **`it.each` block** – Table-driven cases (EUR/2, JPY/0, KWD/3) asserting that a typed price value is transmitted as a zero-padded string with the correct number of decimal digits.
- **Currency-label test** – Asserts the rendered price field's text includes the currency code (e.g. "JPY").

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** – The component under test; imported and mounted directly.
- **`src/infrastructure/http/index.ts`** – Source of the `orvalMutator` export; this test replaces it with a `vi.fn()` stub so all outgoing HTTP traffic is intercepted and the request payload can be asserted.
- **`tests/support/unit/fixtures.ts`** – Supplies the `aShop` factory used to build the `GET /shop` response body.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` validates and wraps mock payloads so they match the Orval-generated client's expectations.
- **`tests/support/unit/reset-shop.ts`** – `resetShop` clears module state between tests.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore` registers product (and other) module services into the kernel before tests run.

## Notes

- The test requires **three** successive `flushPromises` calls before interacting with the form (i18n load → shop fetch → component render) and two after submit. Adding or removing microtask flushes will break assertions.
- `lastPost` relies on `Array.prototype.findLast` (ES2023). The project must target a runtime that supports it.
- The `orvalMutator` mock keys off `config.url` and `config.method` strings; if the generated client changes how it passes these fields, the mock will silently return `undefined` and tests will fail with confusing errors rather than a clear "unhandled URL" message.
- `shopCurrencyCode` and `shopMinorUnits` are module-level `let` bindings mutated inside tests. They are reset in `beforeEach`, but a test that throws before `beforeEach` re-runs could leave stale values visible in error snapshots.
