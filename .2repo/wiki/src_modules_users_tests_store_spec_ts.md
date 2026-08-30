# src/modules/users/tests/store.spec.ts

## Purpose
Unit tests for the `useUsersStore` Pinia store. It mocks the HTTP transport (`orvalMutator`) at the boundary and asserts on the raw request objects (URL, method, body shape) that the store's actions produce. This mirrors the products store spec in structure and rationale.

## Key elements
- **`lastRequest()`** — helper that extracts the most recent argument passed to the mocked `orvalMutator`; throws if it was never called.
- **`lastFormData()`** — same as above but asserts the body is a `FormData` instance before returning it.
- **`respondWithItems(items)`** — sets the mock to resolve a paginated envelope (`{ data: { items } }`) for list endpoints.
- **`lastBody()`** — returns the JSON body of the most recent request (used for the search route).
- **`describe('createUser')`** — verifies JSON vs. multipart encoding, Blob (not File) handling, and that unset optional fields are omitted (no `"undefined"` strings).
- **`describe('updateUser')`** — verifies PUT encoding, that password and uploaded Blob never persist in store state, and that `onUploadProgress` is forwarded to the transport as a second argument.
- **`describe('deleteUser')` / `describe('hardDeleteUser')`** — pin the distinct URLs (`/users/:id` vs `/users/:id/hard`) to prevent accidental conflation of soft and hard delete.
- **`describe('read paths')`** — covers `fetchUsers`, `fetchPaginationUsers` (defaults and explicit page/size), `fetchUser`, and `watchSearchUsers` (filter passthrough including `id` unrenamed).

## Relationships
- **`src/infrastructure/http/index.ts`** — the module is mocked (`vi.mock`) so that `orvalMutator` is replaced with a `vi.fn()`. All request assertions inspect what was passed to this function.
- **`tests/support/stub.ts`** — provides `asStub`, used by `lastBody()` to cast the raw request data into a typed record without a runtime guard.

## Notes
- Tests **return** promise chains rather than `await`-ing; Vitest treats a rejected returned promise as a failure, so assertions inside `.then` are equally binding (see `docs/tools/unit-testing.md`).
- `@api` (the generated orval client) is deliberately **not** mocked; the multipart/JSON encoding decision lives in that layer, so the test mocks the transport below it instead.
- The `Blob`-vs-`File` test exists because encoders like axios' `toFormData` silently drop plain `Blob` instances that aren't `File` subtypes.
- `fetchPaginationUsers` rides the `POST /users/search` route (a paged read is a filter-less search), which is an intentional convention distinct from a plain `GET /users`.
- `watchSearchUsers` passes `id` through unrenamed (unlike the products store); the test pins this so the difference stays deliberate.
