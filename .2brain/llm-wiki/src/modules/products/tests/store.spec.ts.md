---
source: src/modules/products/tests/store.spec.ts
sha256: 74b660410002da0d7747017cfaead86244b4479dac96f8c3db169bc48b90458b
signature: 8bd7112025e669001a7a96580ca1266e45a99c26c3b096de068ce49000a4810a
generated_at: 2026-11-10T05:32:01.274686+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/store.spec.ts

## Purpose

Unit tests for the products store's own decision logic: whether a create/update call takes the JSON or multipart branch, how `translations` is encoded on each path, and how the cache is scoped by the active language. The CRUD wrappers themselves are thin over `@guebbit/vue-toolkit` and are intentionally out of scope; the multipart encoding and `translations` serialisation are this repo's logic.

## Key elements

- **`lastRequest()` / `lastFormData()`** — Inspect the most recent `orvalMutator` call; `lastFormData` additionally asserts the body is a `FormData` instance.
- **`respondWithItems(items)`** — Re-mocks `orvalMutator` to return a paginated envelope (`items` + `meta` matching the real `PaginationMeta` shape, including `totalPages`).
- **`lastBody()`** — Shorthand for the JSON body of the latest request (e.g. what `POST /products/search` reads).
- **`productReads()` / `localeReads()`** — Count transport calls to a specific URL (`/products/p1`, `/locales`).
- **`answerLocales(...rows)`** — Re-mocks `orvalMutator` to return a locale manifest envelope.
- **`row(tag, active)`** — Factory for a single `GET /locales` manifest entry.
- **`PRODUCT`** — A fully populated `Product` seed for optimistic-update tests.
- **`TRANSLATIONS`** — Minimal valid translations map (`{ en: { title: 'Gadget' } }`).
- **Module-level mock of `@/infrastructure/http`** — `orvalMutator` is replaced; DELETE resolves to `undefined` (no data), all other methods resolve to a minimal product record, both parsed through `parseOrvalFixture`.
- **`describe('createProduct')`** — Asserts JSON vs multipart branch, `translations` JSON-encoding inside multipart, Blob (not File) image field, repeated-field encoding of `categories`/`tags`, omission of unset optionals, and `onUploadProgress` forwarding.
- **`describe('updateProduct')`** — Asserts PATCH (not PUT) semantics, JSON vs multipart, and `translations` encoding on the update path.
- **`describe` (locale / cache scoping)** — Exercises `GET /locales` interaction and language-scoped cache reads (visible in the truncated portion).

## Relationships

- **`src/modules/products/store.ts`** — The system under test; `useProductsStore` is the Pinia store whose actions are exercised.
- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`; the module is replaced at the module level so the real axios transport is never reached.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `parseOrvalFixture` (validates mock responses against the generated orval schema) and `contractRequest` (validates request bodies against `@api/schemas`).
- **`tests/support/unit/fixtures.ts`** — Supplies `NO_PRODUCT_ACTIONS`, a shared constant used in the `PRODUCT` seed.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register Pinia/vue-test-utils wiring before any test runs.
- **`tests/support/stub.ts`** — `asStub` is a typed-cast helper used by `lastBody`.

## Notes

- **No `@api` mock.** The generated client (`@api/schemas`, `@api` client) is *not* mocked; only `orvalMutator` is. This means the real FormData-encoding path (store → generated client → mutator) executes, catching regressions in `categories` repetition and unset-optional handling that TypeScript cannot express.
- **`it` blocks return their promise chain** rather than using `await` inside. Assertions in `.then(…)` are just as binding as awaited ones; this is an intentional style choice, not an oversight.
- **`beforeEach`** calls `setActivePinia(createPinia())` and `vi.clearAllMocks()`, so each test gets a fresh Pinia instance and a clean mock call history.
- **`wireModulesIntoCore()`** runs at import time (outside any `beforeEach`), so it executes exactly once per test-file load.
- **`PRODUCT` uses `NO_PRODUCT_ACTIONS`** rather than a literal array, keeping the fixture in sync with the shared fixture definition.
