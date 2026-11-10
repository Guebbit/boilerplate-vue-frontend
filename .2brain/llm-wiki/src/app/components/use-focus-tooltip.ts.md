---
source: src/app/components/use-focus-tooltip.ts
sha256: 46f97718fb82e90204ac140374e9c9f152e613350fb2c3bb4cbbe5b70dd853d3
signature: 40e7680996f4c20743ca7c85dd11164c235a8dc394c9caa7f669edc43be91357
generated_at: 2026-11-10T02:53:47.199651+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/use-focus-tooltip.ts

## Purpose

A small Vue composable that replaces Vuetify's built-in `open-on-focus` wiring for nav-button tooltips, giving the caller an explicit open state and two listeners. It exists because Vuetify's default focus handling has a 50 ms reopen lock and a synchronous close that creates a keyboard trap; both are problems here. Shared by the two nav-button components so they behave identically.

## Key elements

- **`FocusTooltip` (interface)** — the shape the composable returns: `tooltipOpen` (bind to `v-tooltip`'s `v-model`), `canHover` (bind to `open-on-hover`), `openTooltipOnRealFocus`, and `closeTooltip`.
- **`useFocusTooltip()` (exported composable)** — creates the `tooltipOpen` ref, reads the `(hover: hover)` media query via `useMediaQuery`, and returns the two listeners.
  - `openTooltipOnRealFocus` — opens the tooltip only if `event.target.matches(':focus-visible')`, replicating Vuetify's check without its reopen lock.
  - `closeTooltip` — defers `tooltipOpen = false` by one macrotask (`setTimeout 0`) so focus has already moved to the next element before the overlay closes; prevents Vuetify from pulling focus back (keyboard trap).
- **`canHover`** — `Readonly<Ref<boolean>>` sourced from `useMediaQuery('(hover: hover)')`; used to gate `open-on-hover` so tap-triggered compatibility mouse events on touch devices don't leave a stuck tooltip.

## Relationships

- **`AppNavIconButton.vue`** and **`AppNavPinnedButton.vue`** are the two consumers. They differ in *what* the tooltip displays but both bind `tooltipOpen` to `v-tooltip`'s `v-model`, `canHover` to `open-on-hover`, and the two listeners to their `focus`/`blur` events.

## Notes

- The `setTimeout(0)` in `closeTooltip` is load-bearing, not cosmetic. A synchronous close while `document.activeElement` is `<body>` causes Vuetify's overlay to re-focus the activator, trapping the keyboard. One task later focus has already moved on.
- `canHover` is exposed as `Readonly<Ref<boolean>>`; treat it as input-only in the consuming component.
- The composable intentionally does **not** track mouse hover state itself — hover is still delegated to Vuetify's `open-on-hover`, which is simply disabled on touch via `canHover`.
