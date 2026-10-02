---
source: src/modules/products/tests/store.spec.ts
sha256: ec2b5972572b89c81244be94fd9039c1492ab941e46e8e66a9a825f1a2014f54
generated_at: 2026-10-02T15:39:52.125699+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/products/tests/store.spec.ts

## Purpose

Unit tests for the products Pinia store's own decision logic — specifically the JSON-vs-multipart branch on create/update, how `translations` is encoded in each mode, and how the cache scopes by active language. The CRUD wrappers around `@guebbit/vue-toolkit` are intentionally untested; only the repo-specific encoding and branching is covered.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a stub that returns shape-appropriate envelopes (empty body for DELETE, a product record otherwise). The generated client and `@api` are *not* mocked; the real client runs against this transport stub.
- **`lastRequest()` / `lastFormData()` / `lastBody()`** — Helpers that pull the most recent axios config handed to `orvalMutator`, narrowing the body to `FormData` or a plain object as needed.
- **`respondWithItems(items)`** — Re-stubs the transport to return a paginated `orvalEnvelope` (with `meta.totalPages`) for read-path tests.
- **`PRODUCT` / `TRANSLATIONS`** — Seed fixtures for optimistic-update and encoding assertions.
- **`describe('createProduct', …)`** — Asserts: JSON `POST /products` without image; multipart with image; `translations` JSON-encoded into a single FormData part; `Blob` (not only `File`) accepted for `imageUpload`; `categories`/`tags` sent as repeated fields (not indexed keys); unset optionals omitted rather than serialized as `"undefined"`; `onUploadProgress` forwarded to the transport.
- **`describe('updateProduct', …)`** — Asserts `PATCH` (merge semantics); multipart when image present; the VAT edge case where `taxClass: null` is sent as a *second*, separate JSON `PATCH` because a multipart part cannot carry `null`.

## Relationships

- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`, the single transport function the tests mock. All request-shape assertions read from this mock's call log.
- **`tests/support/stub.ts`** — Provides `asStub<T>`, a type-narrowing cast used by `lastBody()`.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called once at module level to register Pinia and i18n so the store can be instantiated outside a component tree.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest`. The first two shape mock responses; `contractRequest` validates a request body against the generated OpenAPI schema before asserting individual fields.

## Notes

- Tests **return** their promise chain (`it('…', () => store.method().then(…))`) rather than `await`-ing inside. This keeps the assertion binding identical to a top-level `await` while avoiding Vitest's unhandled-rejection window.
- The mock's default resolution inspects `config.method` to choose between an empty envelope (DELETE) and a product-shaped body. If a new HTTP method is added to the store, the mock must be extended or it will silently resolve with the wrong shape.
- `contractRequest(schemas.X, body)` is the gate: it validates against the generated API schema *before* the field-level `expect`, so a contract drift fails here rather than as a confusing field mismatch.
- The "repeated fields, not indexed keys" test (`formData.getAll('categories')`) exists because axios `toFormData` and other encoders produce `categories[0]`/`categories[1]` keys that the backend does not parse — a silent data-loss regression.
