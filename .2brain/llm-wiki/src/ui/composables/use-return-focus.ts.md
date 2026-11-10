---
source: src/ui/composables/use-return-focus.ts
sha256: 49fc99705ea994f3e98c76dfa26c2727b1fd01a7b231bb757f696bb7e9d00e1f
signature: 3b15450f2f567da369421d615ae7df4e5986c536c07fdeb7e8f063e3303622da
generated_at: 2026-11-10T06:24:44.229455+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-return-focus.ts

## Purpose

Restores keyboard focus to the element that opened a dialog once the dialog closes. Without this, a dialog opened via an external activator (a button, etc.) drops focus to `<body>` on close, forcing keyboard users to navigate from the top of the page again.

## Key elements

- **`useReturnFocus(isOpen: () => boolean)`** (sole export) — A Vue composable that snapshots the focused element on open and returns focus to it on close. Accepts any boolean getter (model value, computed, store flag).
- **`focusedControl()`** (internal) — Returns `document.activeElement` if it is an `HTMLElement` other than `<body>`; otherwise `undefined`. Used to detect "nothing meaningful was focused."
- **`opener`** (internal mutable) — Holds the `HTMLElement` to restore focus to; cleared after restore.

## Relationships

No dependency-graph neighbors are recorded for this file. It depends only on Vue's reactivity primitives (`nextTick`, `onScopeDispose`, `watch`).

## Notes

- The `watch` callback intentionally relies on Vue's default *pre*-update timing: on open, Vuetify has not yet moved focus into the dialog, so `activeElement` is still the opener.
- `onScopeDispose` is a safety net for dialogs rendered with `v-if` that are destroyed in the same tick they close—the watcher never observes a `true → false` transition, so focus is restored at dispose time instead.
- Focus is restored inside `nextTick` with `preventScroll: true` so the browser does not jump the viewport.
- The `target?.isConnected` guard bails out if the opener element has already been removed from the DOM by the time the dialog closes.
- Two `eslint-disable-next-line` comments suppress `@typescript-eslint/no-floating-promises` for the fire-and-forget `void nextTick(...)` calls.
