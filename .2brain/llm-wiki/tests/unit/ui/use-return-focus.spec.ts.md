---
source: tests/unit/ui/use-return-focus.spec.ts
sha256: 7eaae2b81103095dab67372053bb53130df6873ca1c62df81fea500b5248576a
signature: aceab683784c9c963cee27ef6ee03178b5bfe7c79e835fae0572509103f5ea61
generated_at: 2026-11-10T08:31:21.110645+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-return-focus.spec.ts

## Purpose

Unit tests for the `useReturnFocus` composable, verifying that a dialog with no activator returns focus to the control that opened it—and only when that control is still in the DOM. Each test drives the composable through Vue's reactivity system and asserts on `document.activeElement`.

## Key elements

- **`focusedButton()`** – helper that creates, appends, and focuses a `<button>` in `document.body`; returns the element so tests can reference or remove it later.
- **`settle()`** – helper that awaits two consecutive `nextTick()` calls, ensuring both the composable's watcher and its internal `nextTick` hand-back have flushed.
- **`describe('useReturnFocus')`** – top-level suite with five cases:
  - *puts focus back on the opener when the dialog closes* – standard open → close cycle.
  - *remembers the opener of a dialog that is mounted already open* – `open` starts `true`.
  - *hands focus back when the dialog is destroyed while open* – calls `scope.stop()` instead of toggling `open`.
  - *leaves focus alone when the opener has left the page* – removes the opener element before closing.
  - *has nothing to hand back when nothing held focus on open* – no element is focused at open time; expects `document.body` to remain active.
- **`afterEach`** – resets the DOM via `document.body.replaceChildren()`.

## Notes

- `document.body.focus()` is used as a **stand-in for Vuetify** moving focus into the dialog; the composable itself does not depend on Vuetify.
- The composable is always invoked inside an `effectScope` so tests can tear it down explicitly (`scope.stop()`) or let `afterEach` implicitly end the scope.
- The "destroy while open" test is the only one that calls `scope.stop()`, exercising the composable's cleanup path rather than its close-detection watcher.
- The "opener left the page" test expects `document.body` as `activeElement` (not `null`), confirming the composable simply does not call `.focus()` when the stored reference is no longer connected.
