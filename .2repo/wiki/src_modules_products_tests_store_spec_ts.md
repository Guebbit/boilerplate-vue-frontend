# src/modules/products/tests/store.spec.ts

## Purpose

Unit tests for the products store's create, update, and delete actions. Focuses on the repo-specific logic — the JSON-vs-multipart branching, request shaping, and optimistic-update patching — rather than the thin CRUD wrappers over `@guebbit/vue-toolkit`. Mocks only the transport (`orvalMutator`) so the generated client and FormData encoding run for real, catching wire-format regressions that TypeScript cannot.

## Key elements

- **`lastRequest()`** — extracts the most recent axios config (url, method, data) passed to `orvalMutator`; throws if never called.
- **`lastFormData()`** — same as above but asserts the body is a `FormData` instance before returning it.
- **`lastBody()`** — returns the JSON `data` field of the last request via `asStub`.
- **`respondWithItems(items)`** — sets `orvalMutator` to resolve a paginated envelope (`items` + `meta` matching the real `PaginationMeta` shape, including `totalPages`).
- **`PRODUCT`** — a fully populated `Product` seed object used by the optimistic-update tests.
- **`describe('createProduct')`** — verifies JSON POST (no image), multipart POST (image), Blob-not-File encoding, repeated `categories`/`tags` fields (not `categories[0]`), omission of unset optionals, and `onUploadProgress` forwarding.
- **`describe('updateProduct')`** — verifies JSON PUT, multipart PUT, optimistic patch visible before the response resolves, Blob never persisted in store state, and `onUploadProgress` forwarding.
- **`describe('deleteProduct')`** — verifies the DELETE call targets `/products/:id`.

## Relationships

- **`src/infrastructure/http/index.ts`** — exports `orvalMutator`, the HTTP transport this spec mocks with `vi.mock`. All request-shaping assertions read from `orvalMutator`'s call arguments.
- **`tests/support/stub.ts`** — exports `asStub`, a type-narrowing cast helper used by `lastBody()` to type the last request's data as `Record<string, unknown>`.
- **`@/modules/products/store`** (SUT) — the `useProductsStore` Pinia store whose actions are exercised here.
- **`@types`** — provides the `Product` type used by the `PRODUCT` fixture.

## Notes

- `@api` is intentionally **not** mocked; the generated client and its FormData encoder run for real. Only `orvalMutator` (the transport boundary) is stubbed.
- Tests **return** their promise chains instead of using `await`; assertions inside `.then` carry the same binding in Vitest.
- The optimistic-update test uses `mockImplementationOnce` (not `mockImplementation`) because `beforeEach` → `vi.clearAllMocks()` clears recorded calls but **not** a persistently-set implementation.
- That same test uses `vi.waitFor` rather than a fixed number of microtask ticks, because the toolkit awaits `cancelQueries()` before writing the optimistic record and the tick count is TanStack's concern.
- The "repeated fields, not indexed keys" test exists because `FormData.append('categories', v)` in a loop is the only way to get multi-value fields on the wire; TypeScript gives no signal if a regression switches to `categories[0]`.
- The "omits unset optional fields" test guards against the string `"undefined"` appearing as a FormData value when a field is left `undefined`.
