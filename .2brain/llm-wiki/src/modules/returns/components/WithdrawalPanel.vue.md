---
source: src/modules/returns/components/WithdrawalPanel.vue
sha256: 33e2f51b3d6b980b85b9016c9b25b84dd380246ac509af1a7fad0925022252fd
generated_at: 2026-10-02T15:43:24.746894+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/WithdrawalPanel.vue

## Purpose

Renders the returns section of an order page: the EU right-of-withdrawal button (Consumer Rights Directive Art. 11a), a return-request form for faulty/wrong goods or part-orders, and a list of withdrawals/returns already opened on the order. The withdrawal button's visibility is entirely server-driven (`canWithdraw` prop); this component never computes the withdrawal window itself.

## Key elements

- **Props** — `orderId`, `canWithdraw`, `withdrawUntil`, `orderStatus`, `items`. All optional except `orderId`; they mirror the server's `Order.actions.withdraw*` fields and order state.
- **`handleWithdraw()`** — Opens a confirmation dialog (required by the directive), then calls `openReturn({ reason: 'withdrawal' })` on the store. On success emits `opened` and reloads; on failure surfaces an inline blocking error next to the button.
- **`handleReturnOpened()`** — Fired by `ReturnRequestForm`; re-reads the order's return list and emits `opened` so the parent page refreshes.
- **`returnLines` (computed)** — Derives which order lines are still returnable by calling `returnableLines()` from the domain module; empty until the order status passes `isReturnableOrderStatus` and until all units are consumed.
- **`loadOpened()`** — Fetches existing returns via the store; a failed read silently resets the list to `[]` rather than blocking the UI.
- **`useBlockingError`** — Per-button error state for the withdrawal action; displayed via `InlineErrorAlert`.

## Relationships

- **`../store.ts` (useReturnsStore)** — Calls `openReturn` to submit a withdrawal, `fetchOrderReturns` to load the existing list, and reads the `loading` ref to disable the button during in-flight requests.
- **`../domain/returnable-lines.ts`** — Imports `isReturnableOrderStatus` to gate the returns form on order status, and `returnableLines` to compute the selectable line list.
- **`./ReturnRequestForm.vue`** — Rendered as a child when `returnLines` is non-empty; listens to its `opened` event to refresh state.

## Notes

- The component is intentionally "dumb" about eligibility: it never inspects dates or counts days. The server's `actions.withdraw` flag is the single source of truth for whether the button appears.
- The confirmation dialog is a hard requirement (EU directive mandates a confirmation step, not a single click, and no reason selection).
- A failed `fetchOrderReturns` call degrades gracefully — the opened-returns list simply stays empty and the withdrawal button remains usable.
- The section hides itself entirely (`v-if`) when there is nothing to show: no withdrawal offer, no open returns, and no returnable lines.
