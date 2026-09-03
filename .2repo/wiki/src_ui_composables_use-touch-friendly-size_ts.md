# src/ui/composables/use-touch-friendly-size.ts

## Purpose

A single-purpose Vue composable that returns a reactive Vuetify `size` prop value for row-action buttons. On desktop it yields `'small'` (compact density); on mobile (below the `sm` breakpoint) it yields `undefined` so Vuetify falls back to its larger default, keeping the touch target at or above WCAG's 44 px recommendation.

## Key elements

- **`useTouchFriendlySize(): ComputedRef<'small' | undefined>`** — The sole export. Reads `mobile` from Vuetify's `useDisplay()`, then returns a `computed` that resolves to `undefined` when `mobile` is `true` and `'small'` otherwise. Intended to be bound directly to `:size` on a `v-btn`.

## Relationships

No internal project dependencies. External imports: `vue` (`computed`, `ComputedRef`) and `vuetify` (`useDisplay`). No other files in the repository graph reference it by name in the provided neighbor list.

## Notes

- `undefined` is intentional: it tells Vuetify to use its own default button size (larger than `small`). Binding `size="undefined"` as a string would be a bug; the composable returns the JS value, not the string.
- `useDisplay().mobile` tracks the `sm` breakpoint (≥ 640 px) by default in Vuetify, so the switch point is that breakpoint, not a custom one.
- The composable is stateless and side-effect-free; it can be called multiple times in different components without shared mutable state.
