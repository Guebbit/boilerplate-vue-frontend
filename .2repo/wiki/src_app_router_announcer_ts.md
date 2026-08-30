# src/app/router/announcer.ts

## Purpose

A small, router-owned state module that handles two accessibility concerns after navigation: publishing the new page title into a live region for screen readers, and deferring focus movement to the main landmark until the *new* page's DOM is mounted. It exists because a SPA otherwise swaps content silently (WCAG 4.1.3) and because the `<v-main>` element available at the moment of navigation belongs to the page about to unmount.

## Key elements

- **`routeAnnouncement`** — `Ref<string>` holding the title of the most recent navigation. Written by the router, rendered by `App.vue` inside a visually-hidden `role="status"` region.
- **`MAIN_CONTENT`** — CSS selector (`'main[data-main-content]'`) targeting the `<v-main>` landmark in `LayoutDefault.vue`.
- **`requestMainFocus()`** — Sets the internal one-shot flag so the *next* mounted layout knows to steal focus.
- **`consumeMainFocus()`** — Called by the layout on mount. If the flag is set, queries `MAIN_CONTENT`, calls `.focus({ preventScroll: true })`, clears the flag, and returns `true`; otherwise returns `false`.
- **`mainFocusPending`** (module-private) — The boolean flag bridging the old page's unmount and the new page's mount.

## Relationships

No dependency-graph neighbors are recorded for this file. The module is a leaf consumer (only imports `ref` from `vue`) and is expected to be imported by the router (to write `routeAnnouncement` / call `requestMainFocus`) and by `LayoutDefault.vue` (to call `consumeMainFocus` on mount), per the file's own documentation.

## Notes

- The focus logic uses a plain `let` rather than a Vue `ref` because the value is never reactive-rendered; it is a one-shot hand-off signal consumed exactly once.
- `requestMainFocus` / `consumeMainFocus` are intentionally split so the router can signal the request *before* the new layout exists in the DOM. Calling `focus()` directly inside `afterEach` would target the old page's `<v-main>`, which is about to unmount and would take focus with it.
- `focus({ preventScroll: true })` is used deliberately to avoid a jarring scroll jump on navigation.
- `consumeMainFocus` returns `false` (without clearing the flag) if `MAIN_CONTENT` is not found in the DOM, meaning the request is *not* lost in that edge case.
