# src/ui/molecules/FormCounterInput.vue

## Purpose

A thin wrapper around Vuetify's `v-number-input` that adds two things the raw component doesn't provide: a dev-time guard ensuring the field is accessible (either a visible `label` or an `ariaLabel` must be supplied), and a uniform `errorMessages` prop shape so this stepper integrates with the same validation pattern as every other form field in the project.

## Key elements

- **`count`** (`defineModel<number>()`) — two-way model binding for the current value; `v-number-input` handles min/max/step enforcement natively.
- **`label` / `ariaLabel`** — mutually exclusive access naming. At most one is expected; the dev guard warns if both are absent.
- **`step`** (default `1`) — increment/decrement magnitude passed to `v-number-input`.
- **`min` / `max`** — optional numeric bounds forwarded to `v-number-input`.
- **`errorMessages`** (`string | string[]`) — validation messages displayed beneath the field, matching the prop convention of sibling form fields.
- **`onMounted` guard** — in `DEV` mode only, logs a warning via `@/infrastructure/utils/logger.ts` if neither `label` nor `ariaLabel` was provided.

## Relationships

- **`@/infrastructure/utils/logger.ts`** — imported for the dev-time `logger.warn` call inside `onMounted`.
- **Vuetify `v-number-input`** — the sole rendered element; all numeric behavior (min, max, step, model binding) is delegated to it.
- No other graph neighbors are recorded; this component is a leaf with no further internal imports.

## Notes

- The "label XOR ariaLabel" rule is enforced at **runtime in DEV only**, not at compile time. `defineProps` cannot destructure a discriminated union, so a TS-level mutual-exclusion check is intentionally omitted.
- In the template, `label` is passed as `label || undefined`, converting the empty-string default into `undefined` so `v-number-input` doesn't render an empty label slot.
- `control-variant="split"` and `hide-details="auto"` are fixed presentation choices baked into the template; callers should not override them.
- The component intentionally does **no** value coercion, formatting, or async logic — all numeric semantics belong to `v-number-input`.
