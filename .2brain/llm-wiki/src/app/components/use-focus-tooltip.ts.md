---
source: src/app/components/use-focus-tooltip.ts
sha256: 6b66becdc8de146c2dc68e9a2e6fa2a3f60ee956cf302a52a5dd8c2aff2e99a8
generated_at: 2026-10-02T14:37:15.876502+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/use-focus-tooltip.ts

## Purpose

A small Vue composable that drives the open/close state of a `v-tooltip` from keyboard focus events, replacing Vuetify's built-in `open-on-focus` wiring. It exists to fix two specific problems in that wiring: a 50 ms "reopen lock" that drops rapid Tab-back interactions, and a synchronous-close path that creates a keyboard trap by pulling focus back onto the button. Both the icon button and the pinned button share this behavior.

## Key elements

- **`FocusTooltip`** (interface) — the shape returned by the composable: `tooltipOpen` (a `Ref<boolean>` to bind to `v-tooltip`'s `v-model`), `openTooltipOnRealFocus` (a `focus` event handler), and `closeTooltip` (a `blur` handler).
- **`useFocusTooltip()`** (exported function) — creates the `tooltipOpen` ref and returns it alongside the two handlers.
  - `openTooltipOnRealFocus` checks `:focus-visible` on the target before setting `tooltipOpen` to `true`, so mouse focus does not trigger the tooltip.
  - `closeTooltip` defers the `tooltipOpen = false` assignment with `setTimeout(…, 0)`, letting the browser finish moving focus before Vuetify's overlay runs its close logic.

## Relationships

- **`src/app/components/AppNavIconButton.vue`** — consumer. Calls `useFocusTooltip()` and binds the returned `tooltipOpen` to its `v-tooltip` `v-model`, attaching `openTooltipOnRealFocus` / `closeTooltip` to its `focus` / `blur` events.
- **`src/app/components/AppNavPinnedButton.vue`** — consumer. Identical usage pattern; the two components differ only in what the tooltip displays, not in how it is driven.

## Notes

- The composable deliberately does **not** use Vuetify's `open-on-focus` prop. The file's doc comment links to the exact Vuetify source (`useActivator.ts`, v4.1.5) whose 50 ms reopen lock is the motivation.
- The `setTimeout(…, 0)` in `closeTooltip` is load-bearing: without it, `document.activeElement` is still `<body>` when Vuetify's overlay fires its close, and the overlay restores focus to the activator, trapping the user on the button. Deferring by one macrotask lets focus land on the next tab stop first.
- The `:focus-visible` check on open means the tooltip never opens from mouse clicks or programmatic `.focus()` calls that don't qualify as keyboard-initiated.
