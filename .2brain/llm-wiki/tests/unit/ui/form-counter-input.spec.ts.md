---
source: tests/unit/ui/form-counter-input.spec.ts
sha256: 27522532828af1b0cb89225c8f4bebc9c15c1c274ab7d1823fad4e686fa70df3
generated_at: 2026-10-17T02:46:06.148773+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/form-counter-input.spec.ts

## Purpose

Unit tests for the `FormCounterInput` Vue component. They verify basic rendering, v-model value binding, min/max clamping via the split increment/decrement buttons, and that the component correctly surfaces an `ariaLabel` and `errorMessages` to the user.

## Key elements

- **`mountCounter(props)`** – Local helper that mounts `FormCounterInput` with `@vue/test-utils`, injecting the app's Vuetify plugin globally.
- **`describe('CounterInput component UNIT TEST')`** – Three tests: component renders; `modelValue: 5` appears in the input; a 2-to-9 range clamps at both bounds and disables the respective button when the limit is reached.
- **`press(button)`** (inner helper) – Triggers `pointerdown` → `pointerup` → `nextRenderTick` to simulate a single Vuetify split-control step.
- **`describe('CounterInput — the name and the messages')`** – Asserts `aria-label` is applied to the input and that `errorMessages` text is visible in the wrapper.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** – Provides `nextRenderTick`, used after every prop change and button press to let Vue's reactivity (and Vuetify's internal state) settle before assertions run.

## Notes

- The split-control buttons are exercised with `pointerdown`/`pointerup`, **not** `click`, because Vuetify's `v-number-input` steps on pointer events (hold-to-repeat). Using `click` would not trigger the step logic.
- The Vuetify plugin must be registered in the `global.plugins` mount option; omitting it causes the underlying `v-number-input` to fail rendering.
- Button selection relies on Vuetify's built-in `data-testid=increment` / `data-testid=decrement` attributes rather than CSS classes or custom selectors.
