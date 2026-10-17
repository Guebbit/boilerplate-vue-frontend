---
source: src/modules/products/tests/store.spec.ts
sha256: 7094e4815804299555acdee19a11fbfbda16bff88c33b2d5e7c01f8c70334744
generated_at: 2026-10-17T01:34:33.884962+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/store.spec.ts

## Purpose

Unit tests for `useProductsStore` that verify the store's own decision logic: whether a create/update call serialises as JSON or multipart, how `translations` is encoded in each case, and how the cache is scoped by active language. The CRUD wrappers over `@guebbit/vue-toolkit` are intentionally not exercised; instead the transport (`orvalMutator`) is mocked at the wire boundary so the real generated-client `FormData` encoding runs, catching regressions in array-field repetition and unset-optional handling that TypeScript cannot express.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a `vi.fn` that answers with a parsed orval envelope (DELETE → empty envelope; all other methods → a single product). Each test can override via `respondWithItems`.
- **`lastRequest()` / `lastFormData()`** — read the most recent `orvalMutator` call; `lastFormData` additionally asserts the body is a `FormData` instance.
- **`respondWithItems(items)`** — re-points the mock to return a paginated envelope (`meta.totalPages` etc.) for list/read tests.
- **`lastBody()`** — shorthand for the JSON `data` of the latest request (used for `POST /products/search`).
- **`productReads()`** — counts how many `GET /products/p1` calls the transport has received (cache-hit / invalidation assertions).
- **`PRODUCT`** — fully-populated product used as optimistic-update seed state.
- **`TRANSLATIONS`** — minimal valid `{ en: { title } }` map for encoding assertions.
- **`describe('createProduct', …)`** — covers JSON POST, multipart POST, `translations` as a JSON-string field, `Blob` (not `File`) survival, repeated `categories`/`tags` keys, omission of `undefined` optionals, and `onUploadProgress` forwarding.
- **`describe('updateProduct', …)`** — covers PATCH-JSON, PATCH-multipart, and the split-request case where `taxClass: null` is sent as a second JSON PATCH alongside the multipart upload (since a multipart part cannot carry `null`).

## Relationships

- **`src/modules/products/store.ts`** — the system under test; `useProductsStore` is imported and driven in every `it`.
- **`src/infrastructure/http/index.ts`** — its `orvalMutator` export is the single mock seam; all HTTP assertions go through its call arguments rather than through a fetch/axios stub.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (shapes mock responses to match the real envelope), `orvalEnvelope` (builds the envelope object), and `contractRequest` (validates a request body against the generated schema before asserting).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to attach the product module to the i18n/core wiring that `store.ts` expects.
- **`tests/support/stub.ts`** — `asStub` is a type-narrowing helper used in `lastBody()` to cast the untyped `data` field.

## Notes

- **No `@api` mock.** The generated client and its `toFormData`-style encoder run for real; only `orvalMutator` (the last hop before the network) is intercepted. This is deliberate — it is the only way to catch `Blob`-vs-`File` drops and array-encoding bugs that the type system cannot see.
- **`.then()` chains, not `await`.** Each `it` returns its promise chain so that assertions inside `.then` are still bound to the test's lifecycle. This is a Vitest convention here, not a mistake.
- **`taxClass: null` + image upload** is a two-request operation (multipart upload + a follow-up JSON PATCH to clear the field). Tests assert on `mock.calls.slice(-2)` to inspect both.
- **`meta.totalPages`** must be present in paginated mock responses because `store.ts` reads `meta.totalPages` into `pageTotal`; omitting it would silently break pagination tests without a type error.
