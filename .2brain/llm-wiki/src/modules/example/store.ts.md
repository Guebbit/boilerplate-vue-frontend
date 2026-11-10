---
source: src/modules/example/store.ts
sha256: 2f7aca84bab35687bbf8f11d81608e518ba603dc82df81201a163372a9338508
signature: 37fc3f4d92b3e43cd8d8c57ff9ae224ce55a1d5ada195fdf5b02a3bf85a46303
generated_at: 2026-11-10T04:23:38.961132+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/store.ts

## Purpose

Pinia setup store for the "example" domain. It owns the entity's state (record cache, list, pagination, selection) and every API call the module makes. Generic CRUD is delegated to `useStructureCrudApi` from `@guebbit/vue-toolkit`; hand-written actions cover the cases that do not fit that shape (idempotent create, lifecycle transitions, multipart cover upload, public read).

## Key elements

- **`useExampleStore`** — the store itself (`defineStore('example', …)`). Exposes record/list state, pagination, selection, filters, and all actions below.
- **`ExampleEvent`** (exported type) — `'publish' | 'archive' | 'unarchive'`; the lifecycle doors the server exposes via `Example.actions`.
- **`ExampleFilters`** (exported interface) — search criteria for the list: `text`, `status`, and `sort` (JSON:API CSV string).
- **`EVENT_DOORS`** — internal const mapping each `ExampleEvent` to its generated API call.
- **`createExample(data, options?)`** — wraps `createOne` with an idempotency key (`useIdempotencyKey`) so a network retry reuses the same key and never duplicates the draft.
- **`transitionExample(id, event)`** — calls the matching door, then replaces the cached record with the server's response (which carries the updated `actions` array).
- **`setCover(id, imageUpload, options?)`** — multipart upload to a dedicated route; replaces the cached record with the returned example.
- **`fetchPublished(id)`** — caller-scoped `GET /examples/{id}` for the public screen; intentionally bypasses the signed-in record cache.

## Relationships

- **`provided.ts`** — injects this store into the module's component tree so child views/composables read it via `inject` rather than calling `useExampleStore` again.
- **Views** (`ExamplesList.vue`, `ExampleCreate.vue`, `ExampleEdit.vue`, `ExamplePublished.vue`, `ExampleTarget.vue`) — consume the store's state (list, current example, loading, pagination) and call its actions (`fetchExample`, `createExample`, `updateExample`, `transitionExample`, `setCover`, `fetchPublished`).
- **`ExampleStatusActions.vue`** — renders the lifecycle buttons; calls `transitionExample` for the applicable `ExampleEvent`.
- **`use-example-transition.ts`** — composable that wraps `transitionExample` with local UI state (confirmation, optimistic update) for the target-confirm-once flow.
- **Tests** (`store.spec.ts`, `example-status-actions.spec.ts`, `use-example-transition.spec.ts`, and the per-view specs) — exercise the store's actions and state transitions in isolation or through the components that consume it.

## Notes

- The store follows the same shape as the users store: one `defineStore`, `useStructureCrudApi` for generic reads/writes, hand-written actions beside it. See `docs/tools/state-and-routing.md`.
- `updateExample` defaults to an empty PATCH body (`data = {}`) so callers can pass options without repeating the id.
- `fetchPublished` deliberately does **not** write to `itemDictionary`; a public read and an owner's cached record are treated as different answers.
- `sortTokensOf` converts the URL-held CSV `sort` string into the API's `ExampleSortItem` array; views should set `filters.sort` as a plain string.
- Idempotency key lifecycle: minted before the request, `settle()` on success, `settle(error)` on failure — the key is only reused for network/5xx retries.
