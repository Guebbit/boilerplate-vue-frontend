# tests/unit/ui/form-counter-input.spec.ts

## Purpose

Unit tests for the `FormCounterInput` Vue component (a wrapper around Vuetify's `v-number-input`). Verifies basic rendering, value binding via `modelValue`, min/max clamping with button disablement, and that accessibility labeling and error-message props surface correctly in the rendered output.

## Key elements

- **`mountCounter(props)`** – Local helper that mounts `FormCounterInput` via `@vue/test-utils` with the app's Vuetify plugin registered globally. Accepts an optional props bag to simplify each test case.
- **`describe('CounterInput component UNIT TEST')`** – Core behavioral tests:
  - Renders successfully (smoke check).
  - Reflects `modelValue` in the underlying `<input>` value.
  - Enforces `min`/`max` bounds: after incrementing to the max the increment button gains a `disabled` attribute (and vice-versa at min); pressing a disabled button leaves the value unchanged.
- **`describe('CounterInput — the name and the messages')`** – Accessibility and validation surface:
  - `ariaLabel` prop is applied as `aria-label` on the input element.
  - `errorMessages` array is rendered as visible text alongside the field.

## Relationships

No graph neighbors are recorded for this file. Its direct imports are the component under test (`@/ui/molecules/FormCounterInput.vue`), the shared Vuetify plugin instance (`@/ui/vuetify`), and the `vitest` / `@vue/test-utils` testing libraries.

## Notes

- **Event simulation:** The increment/decrement buttons are driven with `pointerdown` → `pointerup` rather than `click`, matching Vuetify's hold-to-repeat split-control interaction. Each press is chained through a `then()` and a `$nextTick()` to let Vue flush updates before asserting.
- **Selectors:** The test relies on Vuetify's built-in `data-testid="increment"` / `"decrement"` hooks to locate the split-control buttons; it does not query by class or visible text.
- **Disabled-state assertion:** Capping is verified by checking that the button element carries a `disabled` attribute *after* reaching the bound, not by inspecting the button's own `disabled` prop on the Vue component.
- **Value is a string:** The `<input>` value is always compared as a string (`'5'`, `'8'`, `'2'`, etc.), consistent with the DOM `value` property.
