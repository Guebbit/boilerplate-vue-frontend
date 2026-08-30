# src/modules/products/tests/store.spec.ts

## Purpose

Unit tests for the products store's own request-shaping logic: which branch a create/update call takes (JSON vs multipart `FormData`), how the `FormData` is built (repeated keys, omitted optionals, Blob preservation), and how optimistic updates are applied before the transport resolves. The generated HTTP client is exercised for real; only the lowest transport (`orvalMutator`) is mocked, so encoding regressions that TypeScript cannot catch are still asserted.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** – replaces `orvalMutator` with a `vi.fn` that resolves `{ data: { id:'p1', title:'T', price:1 } }`; the single seam between the store and the network.
- **`lastRequest()` / `lastFormData()` / `lastBody()`** – small helpers that pull the most recent `orvalMutator` call and (optionally) narrow its body to `FormData` or the JSON payload.
- **`respondWithItems(items)`** – re-points the mock to return a paginated envelope for list-fetch tests.
- **`PRODUCT`** – a fully-populated `Product` fixture used as seed state for optimistic-update assertions.
- **`describe('createProduct', …)`** – six `it` blocks: JSON path, unwrap-to-entity, multipart path, Blob (not File) preservation, repeated array keys, omitted undefined optionals, and `onUploadProgress` forwarding.
- **`describe('updateProduct', …)`** – mirrors create plus two store-state tests: optimistic title visible while the transport is pending (`mockImplementationOnce` + `vi.waitFor`), and `imageUpload` never persisted in state.
- **`describe('deleteProduct', …)`** – (truncated in source; covers the DELETE branch.)
- **`asStub`** (from `tests/support/stub`) – type-level cast helper used by `lastBody` to access the request body without widening to `unknown`.

## Relationships

- **`src/infrastructure/http/index.ts`** – source of `orvalMutator`, the axios adapter that orval's generated client calls. This spec mocks that module so the store → generated-client → mutator chain runs for real, and asserts on the config object handed to the mutator.
- **`tests/support/stub.ts`** – provides `asStub<T>`, a zero-runtime type assertion used to narrow the untyped `orvalMutator` call argument to a structured shape for assertions.
- **`@/modules/products/store`** – the unit under test (`useProductsStore`). Not listed as a graph neighbor here because the spec file *is* the consumer; the store is the subject, not a collaborator.

## Notes

- Tests **return** their promise chain instead of `await`ing; vitest treats a rejected returned promise as a failure, so `.then`-body assertions are equally binding. This keeps the synchronous `it` body short and avoids extra tick bookkeeping.
- `@api` (the orval-generated client) is **deliberately not mocked**. Mocking it would reduce assertions to "the store called the right function name" and skip the `splitByContentType` / `toFormData` encoding that actually determines whether the backend receives `categories` (repeated) or `categories[0]` (indexed), or `description=undefined` (string) vs. an omitted field.
- The optimistic-update test uses `mockImplementationOnce` (not `mockResolvedValue`) so the promise stays pending until `release()` is called, then **only that one** call is affected; `beforeEach`'s `vi.clearAllMocks()` clears recorded calls but would *not* clear a persistent `mockReturnValue`, which is why the comment warns against that pattern here.
- `imageUpload` is typed `Blob`, not `File`. The spec explicitly asserts the field survives as a `Blob` instance because axios' `toFormData` silently drops plain Blobs when recursing.
- `onUploadProgress` forwarding is tested for both create and update; it was added to the store's signature when `ProductCreate.vue` / `ProductEdit.vue` needed a progress bar, and the second argument to `orvalMutator` exists solely to carry it.
