---
source: src/modules/feedback/store.ts
sha256: 689d392d0929818752f9d66190cd281bbf826e25aacc8f0ff4e1b47fd55dcd67
generated_at: 2026-10-17T00:55:57.086084+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/store.ts

## Purpose

Pinia setup store for the feedback module. It exposes a public `submitContact` action (for the contact form) and an admin inbox — a server-paginated, filterable list of feedback requests supporting status updates and deletion. The inbox is built on `useStructureCrudApi` from `@guebbit/vue-toolkit`, matching the pattern used by the users, products, and orders stores.

## Key elements

- **`useFeedbackStore`** — the exported store (`defineStore('feedback', …)`).
- **`FeedbackFilters`** (local type) — search criteria excluding `page`/`pageSize`; `sort` is a CSV string (e.g. `-createdAt`) parsed by `sortTokensOf`.
- **`requests` / `requestsList`** — record dictionary and list state from the toolkit's CRUD primitive.
- **`filters`, `loading`, `pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`** — shared pagination/search reactive state.
- **`fetchPaginationRequests`** — fetch one page of results (wraps `POST /feedback/search`).
- **`watchSearchRequests`** — subscribe to the live search result (reactive list updates).
- **`updateRequest(id, data)`** — change a feedback request's status.
- **`deleteRequest(id)`** — remove a feedback request.
- **`submitContact(message, options?)`** — public contact-form submission; uses `fetchAny` (not `createOne`) so nothing is cached into the inbox. Accepts an `AxiosRequestConfig` so `Contact.vue` can inject a `HumanCheck` token.
- **`contactIdempotencyKey`** — `useIdempotencyKey()` instance; the same key is replayed on network/5xx retries, a fresh one is minted on any other outcome.

## Relationships

- **`src/modules/feedback/views/Contact.vue`** — calls `submitContact`, passing a `HumanCheck` token via the optional `AxiosRequestConfig` parameter.
- **`src/modules/feedback/views/FeedbackInbox.vue`** — consumes the inbox side: sets `filters`, calls `fetchPaginationRequests` / `watchSearchRequests`, and uses `updateRequest` / `deleteRequest` for admin actions.
- **`src/modules/feedback/tests/store.spec.ts`** — unit tests for this store.

## Notes

- The search endpoint is **POST** (`/feedback/search`), deliberately chosen so a browser reload can never serve a cached row that was just deleted.
- `submitContact` routes through `fetchAny`, **not** `createOne`, because the visitor never reads the inbox — there is no record to cache.
- The toolkit's `list`, `get`, and `create` slots are typed as `never`; the inbox is only ever consumed as a search page.
- `options` in `submitContact` is forwarded to `orvalMutator` (axios-level); it is the mechanism for per-request headers like the solved `HumanCheck` token.
