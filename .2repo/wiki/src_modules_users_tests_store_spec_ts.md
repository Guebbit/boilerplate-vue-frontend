# src/modules/users/tests/store.spec.ts

## Purpose

Unit tests for the `useUsersStore` Pinia store. The transport layer (`orvalMutator`) is mocked so that the tests inspect the raw HTTP requests each store action constructs (URL, method, body shape, FormData vs. JSON) without hitting a network. A users-specific concern — that submitted passwords and uploaded Blobs never linger in store state — is asserted here in addition to the request-contract checks shared in shape with the products store.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a `vi.fn` that resolves a default user record; individual tests override via `mockResolvedValue`.
- **`lastRequest()`** — returns the axios-config object (url, method, data) from the most recent `orvalMutator` call; throws if none was made.
- **`lastFormData()`** — same as `lastRequest` but asserts `data instanceof FormData` and returns the FormData instance.
- **`respondWithItems(items)`** — sets the mock to resolve a paginated envelope (`{ items, meta }`) matching the real `PaginationMeta` shape.
- **`lastBody()`** — casts the last request's `data` to a plain object via `asStub` (the JSON path, as opposed to FormData).
- **`describe('createUser')`** — verifies JSON POST without avatar, multipart POST with avatar, Blob (not File) acceptance, and omission of `undefined` optional fields from FormData.
- **`describe('updateUser')`** — verifies PUT JSON vs. multipart, that `password` and `imageUpload` never appear in `store.users` state, and that `onUploadProgress` is forwarded to the transport as a second argument.
- **`describe('deleteUser')` / `describe('hardDeleteUser')`** — confirm the soft delete hits `/users/:id` and the hard delete hits `/users/:id/hard`; also asserts the two URLs differ.
- **`describe('read paths')`** — covers `fetchUsers`, `fetchPaginationUsers` (default page/size and explicit values, routed through `/users/search`), `fetchUser` (single-record unwrap), and `watchSearchUsers` (all filter fields posted, `id` passed unrenamed).

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole import mocked in this file. `orvalMutator` is the transport function every store action calls; the mock intercepts it so tests can assert on the exact config object passed and control the resolved payload.
- **`tests/support/stub.ts`** — provides `asStub<T>`, a type-assertion helper used by `lastBody()` to cast the last request's `data` to a typed record without a runtime check (the FormData path is guarded separately by `lastFormData`).

## Notes

- Tests **return** their promise chain from `it(…, () => promise)` instead of using `async/await`. Vitest treats a returned rejected promise as a failure, so assertions inside `.then` are just as binding. See `docs/tools/unit-testing.md` for the rationale.
- `beforeEach` resets Pinia (`setActivePinia(createPinia())`) and clears all mocks, so every test starts from a clean store and a fresh mock call log.
- The `meta` object in `respondWithItems` must include `totalPages`; `store.ts` reads `meta.totalPages` for `pageTotal`, so omitting it would produce a response shape the store cannot represent.
- The password-in-state and Blob-in-state tests use `addUser` to seed the store first, then call `updateUser`, and finally `JSON.stringify(store.users)` / `toHaveProperty` to confirm the sensitive or large field was dropped.
- `watchSearchUsers` passes `id` through under the same key (not renamed), deliberately unlike the products store's convention; the test pins this so a future refactor does not "normalise" it silently.
