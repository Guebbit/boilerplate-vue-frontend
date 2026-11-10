---
source: src/app/router/announcer.ts
sha256: b2a474138ebcc95cd86b87eecbb43d7a813dae802d263d3bb8c9d3b9d56144b5
signature: 09b8ad3b32fff94fdb90ffe4e4a9dfb643cef61bc96e3ede3b68f93d245a6ba3
generated_at: 2026-11-10T02:55:25.131182+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/announcer.ts

## Purpose

Router-owned reactive state and helpers for two accessibility concerns: announcing page-title changes to screen readers via a visually-hidden live region, and deferring a focus move to the main landmark until the new page's content has actually rendered.

## Key elements

- **`routeAnnouncement`** (`ref<string>`) — Holds the most recently announced page title. Rendered inside a `role="status"` live region (WCAG 4.1.3). Written only by `announceRouteChange`.
- **`announceRouteChange(title)`** — Clears the ref, then sets it to `title` inside a `nextTick` callback. Returns the `nextTick` promise. The clear-then-set pattern guarantees two separate DOM mutations even when consecutive navigations produce the same title, ensuring the screen reader re-announces.
- **`MAIN_CONTENT`** — CSS selector string (`'main[data-main-content]'`) targeting the `<v-main>` landmark in the default layout.
- **`requestMainFocus()`** — Sets the internal `mainFocusPending` flag to `true`. Called by the router's `afterEach` hook right after a route resolves.
- **`consumeMainFocus()`** — If the flag is set and the main element exists in the DOM, calls `.focus({ preventScroll: true })` on it and clears the flag. Returns `true` on success, `false` otherwise. Intended to be called a tick or two later (after child content has rendered).

## Relationships

No graph neighbors are recorded for this file. Code comments note that `App.vue` reads `routeAnnouncement` for the live region and that `LayoutDefault.vue` provides the `main[data-main-content]` element, but neither appears in the dependency graph.

## Notes

- `mainFocusPending` is a plain module-level `let`, not a reactive ref — it is an imperative one-shot flag, not UI state.
- `announceRouteChange` returns the `nextTick` promise so a caller can chain the focus move after the announcement DOM update lands.
- The clear-then-set in `announceRouteChange` is deliberate: without it, Vue's reactivity coalesces identical or same-tick assignments into zero DOM patches, leaving the live region silent.
- `consumeMainFocus` uses `preventScroll: true` to avoid a visible page jump when focus moves to `<v-main>`.
