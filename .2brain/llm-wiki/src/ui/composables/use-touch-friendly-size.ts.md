---
source: src/ui/composables/use-touch-friendly-size.ts
sha256: cdc416528a29adaf54dccf6c9d9f17b1bbce3de7742c7f38b8133bcf8323a289
signature: 7ff017bce679a95a36c6680459701125c7cdbe2da3f093342c48bb78d36637fe
generated_at: 2026-11-10T06:25:51.425241+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-touch-friendly-size.ts

## Purpose

Centralises the "is this a touch input?" decision and derives reactive Vuetify `size` values from it. Vuetify's default `small` (28 px) is below the 44 px a finger needs, so on touch devices these composables swap to a larger size (or explicit min-dimensions) where a tap replaces a mouse click.

## Key elements

- **`TOUCH_TARGET_PX`** – Exported constant, `44`. The minimum comfortable tap-target dimension (WCAG 2.5.5).
- **`useIsTouch()`** – Returns a `ComputedRef<boolean>`: resolves when the viewport is below Vuetify's `sm` breakpoint **or** the primary pointer is coarse (`(pointer: coarse)`). Reactive to both.
- **`useTouchFriendlySize()`** – Returns a `ComputedRef<'small' | 'large'>` for binding to `:size` on a `v-btn`. Touch → `'large'` (44 px), otherwise `'small'`.
- **`useTouchTarget()`** – Returns a `ComputedRef<number | undefined>` for `:min-height` / `:min-width`. Touch → `44`, otherwise `undefined` (lets Vuetify's own size prop govern).
- **`useTouchChipSize()`** – Returns a `ComputedRef<'small' | 'x-large'>` for `:size` on a clickable `v-chip`. Touch → `'x-large'` (44 px), otherwise `'small'`.

## Notes

- Two independent signals are OR-ed (width **and** pointer) deliberately: a touch tablet or 2-in-1 laptop can exceed the `sm` breakpoint yet still need the larger target.
- `useTouchChipSize` uses `'x-large'` rather than `'large'` because `v-chip` has no `min-height` prop; the size token is the only way to reach 44 px.
- `useTouchTarget` returns `undefined` (not `0`) on desktop so Vuetify falls back to its intrinsic sizing rather than overriding it.
