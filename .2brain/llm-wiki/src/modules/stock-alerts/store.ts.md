---
source: src/modules/stock-alerts/store.ts
sha256: b68a14b57a6264eeba2b932554b289880802e9bca6b1522551402ae8b17e5da2
signature: 6148e8d8f5f016e9f5ce3ca7cfa09ba7f83e5db83cbbe4a49f23089b18128ee0
generated_at: 2026-11-10T05:55:05.249601+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/store.ts

## Purpose

Pinia setup-store that holds the signed-in shopper's open back-in-stock ("notify me") requests. Every mutating or reading action **replaces the local list wholesale** with whatever the API returns, so the client state can never drift from the server. It also deduplicates concurrent reads so a grid of fifty buttons triggers a single `GET /stock-alerts`.

## Key elements

- **`useStockAlertsStore`** — the exported store (`defineStore('stock-alerts', …)`). Returns `items`, `isAsked`, `loading`, `fetchStockAlerts`, `ensureStockAlerts`, `ask`, `cancel`.
- **`items`** (`ref<StockAlert[]>`) — the open requests, newest-first. The single source of truth inside the store.
- **`askedProductIds`** (`computed<Set<string>>`) — product ids with an open request, kept as a Set for O(1) "already asked?" checks.
- **`isAsked(productId)`** — boolean lookup used by the button to toggle its label.
- **`replaceItems(call)`** — internal helper: runs `call()` through the toolkit's `fetchAny`, then assigns `data.items` to `items` in one shot. Every public action funnels through this.
- **`fetchStockAlerts()`** — issues `GET /stock-alerts` via `replaceItems`.
- **`ensureStockAlerts()`** — memoized read. Caches the in-flight promise in a module-local `shared` variable so N concurrent callers share one request. On failure it toasts **once**, clears `shared`, and resolves `undefined` (never rejects).
- **`ask(productId)`** — `POST /stock-alerts { productId }`; idempotent server-side.
- **`cancel(productId)`** — `DELETE /stock-alerts/{productId}`.
- **`useResetOnViewerChange`** — on person change, clears `items` and the `shared` promise so the next viewer triggers a fresh server read.

## Relationships

- **`NotifyMeButton.vue`** — reads `isAsked` to set its label; calls `ensureStockAlerts` (or `fetchStockAlerts`) on mount to populate state; calls `ask` / `cancel` on click.
- **`StockAlerts.vue`** — renders `items` in a list and reads `loading` for a spinner.
- **`store.spec.ts`** — unit-tests the store actions, the dedup behaviour of `ensureStockAlerts`, and the viewer-change reset.
- **`notify-me-button.spec.ts`** — component tests that stub or spy on the store to assert button interactions.

## Notes

- **Wholesale replacement, never partial mutation.** If you add a field or change the shape of `StockAlert`, make sure the API response always carries the full list; the store will blindly overwrite `items` from whatever comes back.
- **`ensureStockAlerts` swallows errors.** It resolves `undefined` on failure rather than rejecting, and the toast is fired exactly once per failed batch. Callers that need to distinguish "empty list" from "fetch failed" must check for `undefined` explicitly.
- **The `shared` dedup variable is local to the store factory closure**, not a reactive ref. It resets only on viewer change or fetch failure—there is no manual invalidation hook exposed.
- The store is a **setup (function) store**, not an options store; all state lives in `ref`/`computed` locals rather than a plain object.
