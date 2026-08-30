# src/ui/molecules/FormCounterInput.vue

## Purpose

A thin wrapper around Vuetify's `v-number-input` that enforces an accessibility rule (a visible `label` or `ariaLabel` is required) and normalizes the `errorMessages` prop to match the shape every other form field in this codebase accepts. It exists so callers get a uniform stepper without repeating the guard or prop-shape logic.

## Key elements

- **Props** — `label`, `ariaLabel`, `step` (default 1), `min`, `max`, `errorMessages` (`string | string[]`). Together they mirror the surface of other form-field molecules.
- **`count`** — `defineModel<number>()`. Two-way bound to the inner `v-number-input`; min/max/step enforcement is delegated to Vuetify.
- **`onMounted` guard** — In DEV builds only, logs a warning via `@/infrastructure/utils/logger` when neither `label` nor `ariaLabel` is supplied. A compile-time XOR union is intentionally avoided because `defineProps` cannot destructure one.
- **Template** — A single `<v-number-input>` with `control-variant="split"`, `hide-details="auto"`, and `class="max-w-52"`.

## Relationships

- **docs/reference/src-ui.md** — This file is listed in the UI component reference; the doc page links to it as part of the molecule inventory.

## Notes

- The dev-time guard is a *warning*, not a throw—components that omit both labels will still render.
- `label` is passed as `label || undefined` so an empty string doesn't render an empty Vuetify label element.
- `errorMessages` accepts `string | string[]`; pass `undefined` (not an empty array) to suppress the error slot.
- The component is intentionally stateless beyond the model value; all numeric constraints live in props and are handled by Vuetify natively.
