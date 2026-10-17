---
source: src/app/router/announcer.ts
sha256: b2a474138ebcc95cd86b87eecbb43d7a813dae802d263d3bb8c9d3b9d56144b5
generated_at: 2026-10-17T00:06:31.996558+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/announcer.ts

## Purpose

Holds two pieces of router-owned state that `App.vue` reads to satisfy WCAG 4.1.3 (status message on page change) and focus management: the current page-title announcement for a visually-hidden `role="status"` live region, and a one-shot flag that defers moving focus to `<v-main>` until the new route's content has actually rendered.

## Key elements

- **`routeAnnouncement`** — `ref('')`; the string `App.vue` renders inside its live region.
- **`announceRouteChange(title: string): Promise<void>`** — Clears the ref, then sets it after `nextTick`, guaranteeing two separate DOM mutations even when the title is unchanged (Vue would otherwise coalesce into a no-op patch). Returns the tick promise so callers can await.
- **`MAIN_CONTENT`** — CSS selector `'main[data-main-content]'` targeting the `<v-main>` in `LayoutDefault.vue`.
- **`requestMainFocus()`** — Sets the module-level `mainFocusPending` flag to `true` (called from the router's `afterEach`).
- **`consumeMainFocus(): boolean`** — If the flag is set, queries `MAIN_CONTENT`, calls `.focus({ preventScroll: true })`, clears the flag, and returns `true`; otherwise returns `false` (flag survives until the next tick when content is present).

## Notes

- `mainFocusPending` is a plain module-scoped `let`, not a `ref` — it is never rendered, so reactivity is unnecessary.
- The clear-then-set pattern in `announceRouteChange` exists specifically to defeat Vue's change-detection for identical string assignments and for same-tick batched writes; don't "simplify" it to a single assignment.
- `consumeMainFocus` is expected to be called from `nextTick` (or a later tick) by the layout, not from the router callback itself, to give the matched view time to render inside the persistent `<v-main>`.
- No imports of this file are tracked in the dependency graph; it is consumed by `App.vue` (live-region render) and the router's navigation guards (focus hand-off).
