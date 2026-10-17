---
source: src/modules/stats/components/StatsPeriodForm.vue
sha256: 0325b4636894fefe90c0324bcb8c9e8ba75447704f8ac34353e870d598457cc1
generated_at: 2026-10-17T01:40:57.909242+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/StatsPeriodForm.vue

## Purpose

A period-picker form used at the top of every stats page. It provides two date inputs, a bucket-size selector, and quick-select preset buttons. It validates the draft locally (via `periodProblem`) so impossible ranges are explained inline rather than answered by a 422 from the API.

## Key elements

- **Props — `modelValue: StatsPeriodChoice`** – The period currently applied on the page; the component works on a local `draft` copy.
- **Emit — `apply(period)`** – Fired when the user submits a valid draft or clicks a preset; the parent receives a ready-to-send `StatsPeriodChoice`.
- **`draft` (ref)** – Working copy of the period; all field edits mutate this before it is applied.
- **`intervalChosen` (ref)** – Flag that suppresses auto-interval recalculation once the user picks a bucket size by hand.
- **`problem` (computed)** – Runs `periodProblem(draft)` to surface a validation key (e.g. `"reversed"`, `"invalid"`) or `undefined` when valid.
- **`intervalOptions` (computed)** – Maps the `StatsInterval` enum values into `{ value, title }` pairs with i18n labels.
- **Watch on `[from, to]`** – Recalculates `draft.interval` via `autoInterval` unless the user already chose one manually.
- **Watch on `props.modelValue`** – Replaces the draft when the parent changes the period externally (link navigation, reset).
- **`applyPreset(preset)`** – Resolves a preset to a concrete period with `presetPeriod`, resets `intervalChosen`, and emits immediately (no draft step).
- **`apply()`** – The form submit handler; emits the draft only when `problem` is `undefined`.

## Relationships

- **`src/modules/stats/domain/index.ts`** – Barrel import providing `PERIOD_PRESETS`, `autoInterval`, `periodProblem`, `presetPeriod`, and the `PeriodPreset` / `StatsPeriodChoice` types the component relies on.
- **`src/modules/stats/domain/period.ts`** – Source implementation of the period-validation and auto-interval logic re-exported through the domain barrel.
- **`src/modules/stats/views/ProductSales.vue`** – Consumer; renders `StatsPeriodForm` and listens for the `apply` event to drive its data query.
- **`src/modules/stats/views/StatsDashboard.vue`** – Consumer; same parent–child contract as above.
- **`src/modules/stats/tests/stats-period-form.spec.ts`** – Unit/integration tests covering the component's validation, preset, and auto-interval behavior.

## Notes

- The component uses a **dual-script pattern** (`<script>` + `<script setup>`) solely to declare `name: 'StatsPeriodForm'`; `<script setup>` alone cannot set a component name. This is needed for Vue DevTools labels and `<KeepAlive>` matching.
- The `<form>` carries `novalidate` — all validation is custom (via `periodProblem`), so browser date-input constraints do not interfere.
- `applyPreset` bypasses the draft entirely and emits synchronously; a preset is treated as a complete, already-valid period.
- The `data-test` attributes (`stats-period-form`, `stats-from`, `stats-to`, `stats-interval`, `stats-apply`, `stats-preset-*`, `stats-period-problem`) are the stable selectors used by the spec file and E2E suites.
