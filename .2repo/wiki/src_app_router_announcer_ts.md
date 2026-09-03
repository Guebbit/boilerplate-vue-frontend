# src/app/router/announcer.ts

## Purpose

A small, router-owned state module that lets the router communicate two one-off signals to the layout: the new page title (for a visually-hidden live region) and a pending focus request for `<v-main>`. It exists so the router can write these values in `afterEach` without coupling to a global store, and so the correct (new) layout instance can consume the focus request after a route swap.

## Key elements

- **`routeAnnouncement`** – `ref<string>`. The page title to announce via `role="status"` after a navigation. Read by `App.vue` to satisfy WCAG 4.1.3 (status messages without focus change).
- **`MAIN_CONTENT`** – CSS selector constant (`'main[data-main-content]'`) pointing at the `<v-main>` element rendered by `LayoutDefault.vue`.
- **`requestMainFocus()`** – Sets the internal `mainFocusPending` flag to `true`. Called by the router in `afterEach` to signal that focus should move once the next view is mounted.
- **`consumeMainFocus()`** – Checks the flag, queries the DOM for `MAIN_CONTENT`, focuses it with `preventScroll: true`, clears the flag, and returns `true` on success. Called by the layout on mount.
- **`mainFocusPending`** (module-level `let`) – The one-shot boolean that survives the old-layout-unmount → new-layout-mount gap.

## Relationships

No graph neighbors are recorded. The file's own comments identify its consumers: the router (calls `requestMainFocus` in `afterEach`), `App.vue` (renders `routeAnnouncement` in a live region), and `LayoutDefault.vue` (calls `consumeMainFocus` on mount and provides the `<v-main data-main-content>` target).

## Notes

- The focus request is deliberately **not** a Vue ref — it is a plain module-level boolean. This makes it invisible to Vue's reactivity system and guarantees it is consumed exactly once.
- The flag pattern exists because `afterEach` fires *before* the new view mounts; any `<v-main>` present at that moment belongs to the outgoing page and will be destroyed. The flag bridges that gap.
- `consumeMainFocus` returns `false` (rather than throwing) when the element is not yet in the DOM, allowing the caller to retry or no-op gracefully.
- `routeAnnouncement` starts as an empty string, so the initial page load produces no announcement.
