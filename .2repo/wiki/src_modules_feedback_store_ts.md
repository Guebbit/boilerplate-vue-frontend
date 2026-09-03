# src/modules/feedback/store.ts

## Purpose

Pinia (setup-style) store for the feedback module. It exposes a public contact-form submit action and an admin inbox (list, status-update, delete) built on the toolkit's `useStructureRestApi` for shared loading-flag plumbing. It is the first frontend code to call the feedback endpoints, which predate this module.

## Key elements

- **`useFeedbackStore`** — the exported store; composition-API (`defineStore` setup syntax).
- **`submitContact(message)`** — fires `createFeedbackRequest`; available to any visitor.
- **`fetchRequests()`** — loads the full inbox into `requests`; appends `_ = Date.now()` as a cache-buster (see Notes).
- **`updateStatus(requestId, status)`** — PATCHes one ticket's status, then reloads the inbox.
- **`deleteRequest(requestId)`** — DELETEs one ticket, then reloads the inbox.
- **`requests`** — reactive `FeedbackRequest[]` backing the admin inbox view.
- **`loading`** — shared boolean from `useStructureRestApi`, keyed by this store's name via `useCoreStore`.

## Relationships

No graph-neighbor files are recorded. The store imports its four API functions and the `ListFeedbackRequestsParams` type from `@api`, its types (`FeedbackRequest`, `FeedbackRequestStatus`, `CreateFeedbackRequest`) from `@types`, and `useCoreStore` / `useStructureRestApi` from `@guebbit/vue-toolkit`.

## Notes

- **Cache-bust param `_`** is load-bearing, not cosmetic. The BE sends `Cache-Control: private, max-age=30` on the list endpoint, so a plain re-request within that window is a browser HTTP-cache hit (no network call). The natural alternative — a `Cache-Control: no-cache` *request* header — is not in the `cors` package's allowed-request-headers list, so it 500s the CORS preflight. A query param is the only mechanism that both bypasses the cache and survives preflight.
- **Reload-after-write pattern.** `updateStatus` and `deleteRequest` deliberately discard local mutations and call `fetchRequests()` again. The rendered list is always the API's, never a local guess. This is the exact case where the 30 s cache window would otherwise return a stale row (e.g., a just-deleted ticket).
- **No pagination / filtering state** is kept in the store; the inbox is "only ever read as a page" per the comment, and the single `requests` ref holds whatever the current response contains.
