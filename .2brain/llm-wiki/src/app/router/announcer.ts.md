---
source: src/app/router/announcer.ts
sha256: 6c944a9ec7f4bedb2e258c455e5508c4af60e9e26824879edf896e2b040469c4
generated_at: 2026-10-02T11:47:56.163433+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/announcer.ts

## Purpose

Router-owned UI state for accessibility after navigation. Holds the page title to announce in a visually-hidden live region (WCAG 4.1.3) and a one-shot flag that defers focus to `<v-main>` until the new page's content has rendered.

## Key elements

- **`routeAnnouncement`** (`ref<string>`) — The current announcement string. Read by `App.vue` inside a `role="status"` region.
- **`announceRouteChange(title)`** — Clears the ref, then sets the new title on the next tick (two DOM mutations so a screen reader re-announces even if the title is identical to the previous one). Returns the `nextTick` promise.
- **`MAIN_CONTENT`** (const string) — CSS selector `'main[data-main-content]'` for the focus target in `LayoutDefault.vue`.
- **`requestMainFocus()`** — Sets a module-internal `mainFocusPending` flag to `true`. Called by the router in `afterEach`.
- **`consumeMainFocus()`** — If the flag is set, queries `MAIN_CONTENT`, calls `.focus({ preventScroll: true })`, clears the flag, and returns `true`. Returns `false` if no pending request or element not found.

## Relationships

No graph neighbors are registered. In practice this module is written to by the router (via `announceRouteChange` / `requestMainFocus`) and read by `App.vue` (for the live-region binding) and `LayoutDefault.vue` (for the focus target it renders).

## Notes

- `mainFocusPending` is **not** exported; it is a plain module-level `let`. Callers must use the two-step `requestMainFocus` → `consumeMainFocus` pattern (set in `afterEach`, consumed one tick later in `onMounted`/`onUpdated` of the layout).
- The clear-then-set-after-tick in `announceRouteChange` is deliberate: a single assignment of the same string is a reactivity no-op, and two assignments in the same tick collapse into one DOM patch. The split guarantees a second DOM mutation so assistive tech re-reads the region.
- `consumeMainFocus` uses `preventScroll: true` to avoid a visible jump when focus lands on `<v-main>`.
