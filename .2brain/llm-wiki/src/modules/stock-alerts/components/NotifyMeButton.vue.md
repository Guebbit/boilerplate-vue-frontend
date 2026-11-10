---
source: src/modules/stock-alerts/components/NotifyMeButton.vue
sha256: 49be772fa757098ed5b8c2b62259673732778eb121c5d58d111fb8f578b801ce
signature: 0c6dba640ac5ce9e035dd794d6f739709d013ca49c917445307b301a00317bd0
generated_at: 2026-11-10T05:54:22.938013+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/components/NotifyMeButton.vue

## Purpose

A slot-injected button that lets a signed-in shopper request (or cancel) a stock-restock notification for a product that is currently not buyable (sold out, off sale). It is contributed to the `product-actions` slot by the stock-alerts module manifest; the products module that owns the page and card never imports it directly.

## Key elements

- **`defineProps<{ product: Product }>`** — the product the shopper wants to hear about.
- **`offered()`** — returns `true` when `product.buyable` is falsy; the button is only rendered for non-orderable products (or ones already asked).
- **`handleToggle()`** — clears any prior error, then calls `alerts.cancel(product.id)` if already asked, otherwise `alerts.ask(product.id)`. Catches rejections into the local `reportError` (per-button blocking error).
- **`onMounted` hook** — if the shopper is signed in, fires `alerts.ensureStockAlerts()` so a shared grid read populates `isAsked` state without each button issuing its own request.
- **Template visibility guard** — `v-if="isAuth && (offered() || alerts.isAsked(product.id))"` ensures guests and buyable products never see the button.
- **`useBlockingError`** — local per-button error state (`message`, `report`, `clear`); a failed ask/cancel blocks only this button in place.
- **`loading` (from store via `storeToRefs`)** — doubles as a disable guard to prevent double-clicks.

## Relationships

- **`src/modules/stock-alerts/store.ts`** — provides `useStockAlertsStore`; this component reads `isAsked`, `loading` and calls `ask`, `cancel`, `ensureStockAlerts`.
- **`src/infrastructure/locale-overrides.ts`** — part of the i18n setup; this component resolves its user-facing strings through `useI18n().t()`, which depends on the locale configuration this file provides.
- **`src/modules/stock-alerts/tests/notify-me-button.spec.ts`** — unit tests that mount this component and assert its toggle, visibility, and error-blocking behavior.

## Notes

- The component is **not imported by the products module**. It is wired in through the module manifest's `product-actions` slot registration, so the products card knows nothing about stock alerts.
- `ensureStockAlerts` is intentionally fire-and-forget (`void`); the store toasts a failure once rather than rejecting, so no per-button error path is needed for the initial read.
- The button is disabled (not hidden) while a request is in flight; the `loading` flag comes from the shared store, so a second rapid click on the *same* product is guarded, but a click on a *different* product's button is independent.
