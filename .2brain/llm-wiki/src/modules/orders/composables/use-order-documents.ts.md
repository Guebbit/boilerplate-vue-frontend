---
source: src/modules/orders/composables/use-order-documents.ts
sha256: 33db01a1f98be3acbf21b8e4729eba949f3bea922c0d0bda7730ba55d4a1e604
signature: 4a796e70c612717dae1dfe8cd20acde032a38bc7d1f287fa25782f9cfedf296f
generated_at: 2026-11-10T04:58:26.056265+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/composables/use-order-documents.ts

## Purpose

Vue composable that encapsulates everything the order page needs to render and interact with the invoice and credit-note documents for a single order: availability checks, PDF fetching, download/open actions, and per-action loading and blocked-error state. The consuming view renders exclusively what this composable returns.

## Key elements

- **`useOrderDocuments(currentOrder, targetId)`** — exported composable; takes a reactive order ref and a getter for the routed order id, returns all document state and actions.
- **`invoiceAvailable`** (computed) — reads `currentOrder.actions.invoice === true` directly from the server payload so a lifecycle rule change on the backend immediately disables the buttons.
- **`withInvoice(action)`** (internal) — single fetch-and-callback helper; both `downloadInvoice` and `viewInvoice` go through it, so one HTTP request serves both buttons and one `useBlockingError` instance covers both.
- **`downloadInvoice` / `viewInvoice`** — pass a `Blob` to `saveDownload` or open it in a new tab (managing `URL.createObjectURL` / `revokeObjectURL` lifecycle).
- **`creditNotes`** (ref) — list of `CreditNoteSummary` objects, oldest first; empty array when no invoice or on fetch failure.
- **`loadCreditNotes`** (internal) — guarded by `invoiceAvailable`; on failure silently resets the list to `[]` rather than surfacing a blocking error.
- **`downloadCreditNote(note)`** — fetches and saves one specific credit note PDF; tracks which row is loading via `creditNoteLoadingId`.
- **`watch`** — re-runs `loadCreditNotes` when `targetId`, `invoiceAvailable`, order `status`, or `paymentStatus` change (covers the refund path that adds a note after the API response).

## Relationships

- **`src/modules/orders/store.ts`** — destructures `fetchInvoice`, `fetchCreditNotes`, `fetchCreditNote` from `useOrdersStore()`; all PDF/list HTTP calls originate there.
- **`src/infrastructure/http/download.ts`** — provides `saveDownload`, the function that turns a fetched `Blob` into a browser file download; used by `downloadInvoice` and `downloadCreditNote`.
- **`src/modules/orders/views/OrderTarget.vue`** — the consuming view; calls `useOrderDocuments` and renders the returned state/actions for the invoice and credit-note sections.

## Notes

- `invoiceLoading` is a **local** ref, deliberately not the store's shared `loading`, so paging or cancelling the order does not spin the invoice buttons.
- Credit-note failures are **swallowed** (list resets to `[]`); only invoice failures produce a visible blocking error. The section is treated as supplementary.
- `viewInvoice` revokes the object URL on the tab's `load` event, or immediately if `window.open` returns `null` (popup blocked).
- Each credit-note download is a separate request by design to stay within the invoicing rate limit; there is no "download all" path.
- `targetId` is passed as a **getter** (`() => string | undefined`) rather than a ref so the composable reads the current route id at call time without an extra dependency.
