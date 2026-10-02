---
source: src/modules/products/tests/product-create-currency.spec.ts
sha256: 49efecb6851f4b071b6df6b36388e68fd233b6e3dc526c783dddc1116be94de5
generated_at: 2026-10-02T15:35:10.356934+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-currency.spec.ts

## Purpose

Verifies that the **ProductCreate** form sizes its price input's decimal precision from the shop's currency setting (`GET /products/settings`) rather than from a product payload, since a create form has no existing product to read `currency` from (business rule D11). It also confirms the currency code is displayed beside the amount field.

## Key elements

- **`wireModulesIntoCore()`** — called once at module scope to register enabled modules in the kernel registry so the router can resolve them.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy; the `beforeEach` then implements per-URL responses for `/locales`, `/products/settings`, and `POST /products`.
- **`shopCurrencyCode`** (module-level `let`) — mutated by each test case to drive the mocked settings response.
- **`mountCreate()`** — mounts `ProductCreate` with router, vuetify, i18n, and a stubbed `LayoutDefault`.
- **`pricePrecision(wrapper)`** — extracts the `precision` prop from the rendered `VNumberInput`.
- **`it.each([['EUR',2],['JPY',0],['KWD',3]])`** — parameterized check that the `precision` prop matches the currency's decimal digits.
- **`it('names the currency beside the amount')`** — asserts the `[data-test=product-price-field]` text contains the currency code.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which the spec calls before mounting so the module registry (used by `collectModuleRoutes`) is populated.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the Orval response envelope) and `parseOrvalFixture` (validates the envelope against the generated schema before returning it). Both are used in every mocked HTTP response.

## Notes

- Three chained `flushPromises()` calls are required before assertions; a single flush is not enough for the async locale load → route push → component mount → settings fetch chain.
- The mock dispatches on `config.url` / `config.method` strings rather than named API functions, so adding a new endpoint to the mock requires matching the exact URL the component calls.
- `resetShopCurrency()` in `beforeEach` clears any cached currency state from `@/infrastructure/shop-currency.ts` to prevent leakage between tests.
