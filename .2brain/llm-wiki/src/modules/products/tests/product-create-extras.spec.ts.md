---
source: src/modules/products/tests/product-create-extras.spec.ts
sha256: 983337387102d500cb31e917a479be06d1d08071d9ea1b9fbaa9b578da272ee6
signature: cfeb24f46794dd904473432c2891d2253466a6cbd7bc6dfd096f0a684553a21e
generated_at: 2026-11-10T05:25:16.071028+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-extras.spec.ts

## Purpose
Verifies the `product-create-extras` slot contract on the ProductCreate form: a foreign module's component can register an after-create step that receives the new product's ID, and the create request body stays free of that module's fields (e.g. no `onHand`).

## Key elements
- **`wireModulesIntoCore()`** (module-level call) — registers test modules into the core registry so `enabledModules` and `collectModuleRoutes` resolve real routes.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a controllable mock; the real HTTP layer is never hit.
- **`router`** — a `createMemoryHistory` router whose children are the actual module routes, giving the mounted form a real navigation target (`/en/products/new`).
- **`LOCALES_RESPONSE`** — a static fixture matching the `GET /locales` response shape; fed through `parseOrvalFixture` to keep the mock schema-valid.
- **`beforeEach`** — resets Pinia, configures the `orvalMutator` mock to answer `/locales` and `POST /products` (returning `id: 'p2'`), loads the `en` locale, and navigates the router.
- **`renderExtra`** — minimal render function (`<span data-test="extra">`) used by the fake extra component so the test can assert it mounted.
- **`describe('ProductCreate — the product-create-extras slot')`** — single test that mounts `ProductCreate` with a synthetic `Extra` component injected via `SLOTS_KEY`, submits the form, then asserts (1) the extra rendered, (2) the registered step received `'p2'`, and (3) the `POST /products` body has no `onHand` key.

## Relationships
- **`src/modules/products/views/ProductCreate.vue`** — the component under test; exposes the `product-create-extras` slot and the `registerAfterCreate` prop handed to each injected extra.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` populates the module registry that `enabledModules` / `collectModuleRoutes` read, enabling the router to resolve the `/products/new` route.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` validates and normalises the mock HTTP payloads against the generated orval schemas before they are returned by the `orvalMutator` mock.

## Notes
- The extra component is injected through `provide: { [SLOTS_KEY]: { 'product-create-extras': [Extra] } }` rather than a real Vue slot, so the test exercises the provide/inject contract in isolation.
- The assertion that the POST body lacks `onHand` enforces a design rule: the create endpoint carries only core product fields; inventory-related data is handled exclusively by the after-create step.
- `findLast` is used to locate the `POST` call, assuming it is the last `orvalMutator` invocation; if a future mock adds trailing calls the assertion could silently pick the wrong one.
