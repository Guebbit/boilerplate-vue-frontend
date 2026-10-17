---
source: src/modules/example/store.ts
sha256: b16085bd50028f81dd11a7bade6964c410cf2f2dc296ddeae620edc794c98db2
generated_at: 2026-10-17T00:51:53.137414+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/store.ts

## Purpose

Pinia store for the **example** domain. It centralises every piece of example-related state (record cache, list, pagination, selection) and every call to the generated API client. Generic CRUD is delegated to `useStructureCrudApi`; two hand-written actions cover the cover-image upload and the public (unauthenticated) read that don't fit the generic shape.

## Key elements

- **`ExampleFilters`** (interface) — Search criteria for the list: `text`, `status`, and `sort` (a CSV string using the API's JSON:API sort grammar, as carried in a URL).
- **`useExampleStore`** (Pinia store, id `"example"`) — Returns:
  - *State:* `examples` (record cache), `examplesList`, `selectedExampleId`, `currentExample`, `filters`, `loading`, pagination fields (`pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`).
  - *Generic CRUD (from toolkit):* `fetchExample`, `watchExample`, `watchExamplesSearch`, `createExample`, `updateExample`, `deleteExample`, `addExampleRecord`, `getExample`.
  - **`setCover(id, imageUpload, options?)`** — Multipart upload of a cover image via `replaceExampleCover`; on success calls `editExampleRecord` to replace the cached record with the returned full example.
  - **`fetchPublished(id)`** — Reads a published example via `getPublishedExample`; intentionally **not** stored in the record cache (public read ≠ signed-in read).

## Relationships

- **`views/ExamplesList.vue`** — Consumes `examplesList`, `filters`, pagination state, and `watchExamplesSearch`.
- **`views/ExampleCreate.vue`** — Calls `createExample`, then `addExampleRecord`.
- **`views/ExampleEdit.vue`** — Uses `currentExample` / `getExample`, calls `updateExample` and `setCover`.
- **`views/ExamplePublished.vue`** — Calls `fetchPublished`.
- **`views/ExampleTarget.vue`** — Consumes `selectedExampleId` / `currentExample`.
- **`tests/store.spec.ts`** — Unit-tests the store's actions and state.
- **`tests/example-{create,edit,published}-view.spec.ts`** — Integration tests that mount the corresponding views against this store.

## Notes

- `resourceKey` is set to `'example'`; the layout's global loading indicator and the TanStack Query cache both key off this string.
- `update` is a **PATCH**: the default `data = {}` means omitted fields are left unchanged on the server side.
- `sort` in `ExampleFilters` is a raw CSV string (URL-friendly). `sortTokensOf(..., ExampleSortItem)` converts it to the structured form the generated client expects before the request is sent.
- `setCover` and `fetchPublished` are wrapped in `fetchAny` (the toolkit's non-CRUD executor) so they participate in the same loading / error lifecycle without being modelled as a generic `create/update`.
