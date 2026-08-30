# src/modules/feedback/store.ts

## Purpose

Pinia setup-store for the feedback module. It exposes a public `submitContact` action and an admin inbox (`requests`) with `fetchRequests` / `updateStatus` actions. All three actions run through the toolkit's `useStructureRestApi` so that loading-state plumbing (shared per-store-name flags) is consistent with the rest of the app.

## Key elements

- **`useFeedbackStore`** – the single export; a `defineStore('feedback', …)` setup-store returning state and actions.
- **`requests`** – `ref<FeedbackRequest[]>`; the admin inbox, always populated as a full list (no pagination).
- **`loading`** – reactive boolean from `useStructureRestApi`, wired to `useCoreStore`'s `getLoading`/`setLoading` keyed by the store name `"feedback"`.
- **`submitContact(message: CreateFeedbackRequest)`** – fires the public contact-form endpoint (`createFeedbackRequest`) via `fetchAny`.
- **`fetchRequests()`** – calls `listFeedbackRequests`, stores `response.data.items` into `requests`, and resolves with the stored array.
- **`updateStatus(requestId, status)`** – calls `updateFeedbackRequestStatus`, then immediately re-calls `fetchRequests()` so the rendered list is the server's truth, not a local mutation.

## Relationships

No graph-neighbor files are tracked. The file imports from two external modules:

- **`@guebbit/vue-toolkit`** – provides `useCoreStore` (shared loading-flag registry) and `useStructureRestApi` (generic `loading` / `fetchAny` wrapper).
- **`@api`** – provides the three HTTP functions: `createFeedbackRequest`, `listFeedbackRequests`, `updateFeedbackRequestStatus`.
- **`@types`** – type-only imports for `FeedbackRequest`, `CreateFeedbackRequest`, `FeedbackRequestStatus`.

## Notes

- The API endpoints predate this module; this store is the first frontend consumer. There is no server-side state to reconcile.
- `updateStatus` deliberately **re-fetches the whole inbox** after a status change rather than patching a local row. If the inbox grows large this becomes a full-list round-trip per edit.
- The store name `"feedback"` doubles as the key in `useCoreStore`'s loading-flag map, so any other code that reads `getLoading('feedback')` will see this store's flag.
- All actions are hand-written (the store comment notes this explicitly); `useStructureRestApi` is used only for its `loading` ref and `fetchAny` wrapper, not for auto-generated CRUD.
