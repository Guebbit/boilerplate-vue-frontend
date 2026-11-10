---
source: src/modules/stats/components/StatsPeriodForm.vue
sha256: efa63835cc53426b0732b98f8369734fd888c5c2fd6245750289510de6cffb49
signature: bf8ae9a5541d72a1071286b2afb8aca60cd20eb74425d89c79fd8126a90b64d9
generated_at: 2026-11-10T05:47:23.784193+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/StatsPeriodForm.vue

## Purpose

A reusable period-picker form for all stats pages. It lets the visitor choose a date range, a bucket size, or a quick preset, validates the draft against API limits *before* submitting, and emits only a period the backend will accept — surfacing human-readable problems locally instead of relying on a 422 response.

## Key elements

- **Props** — `modelValue: StatsPeriodChoice` (the currently applied period) and `limits?: StatsLimits` (API ceilings, e.g. max range in days).
- **Emit `apply`** — fires a validated `StatsPeriodChoice` when the visitor clicks *Apply* or selects a preset.
- **`draft`** — local `ref` copy of the period being edited; never mutates `props.modelValue` directly.
- **`intervalChosen`** — flag that suppresses auto-interval once the visitor manually picks a bucket size.
- **`problem`** (computed) — calls `periodProblem(draft, limits)` from the domain; `undefined` means the draft is valid.
- **`chooseInterval(interval)`** — records a manual bucket-size pick.
- **`applyPreset(preset)`** — resets to a complete preset period (`presetPeriod`) and immediately emits `apply`.
- **`apply()`** — guard-emit: only fires if `problem` is `undefined`.
- **Watchers** — (1) re-derives `interval` via `autoInterval` when dates change and no manual pick exists; (2) resets `draft` when `modelValue` changes externally (e.g. URL link, page reset).
- **Template** — Vuetify `<v-card>` containing a `<form novalidate>` with two date inputs, an interval `<v-select>`, a conditional `role="alert"` problem message, an *Apply* submit button (disabled while invalid), and one button per entry in `PERIOD_PRESETS`.
- **`export default { name: 'StatsPeriodForm' }`** — provides a stable name for devtools / `<KeepAlive>` since `<script setup>` cannot declare one.

## Relationships

- **`src/modules/stats/domain/index.ts`** (and the underlying `period.ts`) — source of `PERIOD_PRESETS`, `autoInterval`, `periodProblem`, `presetPeriod`, and the `StatsPeriodChoice` / `PeriodPreset` types. All validation and preset logic lives in the domain; this component only orchestrates UI state.
- **`src/modules/stats/views/StatsDashboard.vue`** / **`StatsProductSales.vue`** — parent views that bind `v-model` to this form's `modelValue`/`apply` contract and pass `limits` once loaded from the API.
- **`src/modules/stats/tests/stats-period-form.spec.ts`** — unit/integration tests for this component's behaviour (draft editing, auto-interval, preset apply, problem display).

## Notes

- The form uses `novalidate` and handles all validation via the domain's `periodProblem`; the browser's native date-input validation is intentionally bypassed.
- `draft` is a shallow copy (`{ ...props.modelValue }`), not a reactive proxy into the prop — mutating it never triggers the external watcher.
- `intervalChosen` is reset to `false` only by `applyPreset`; editing dates *after* a manual pick does **not** re-enable auto-interval.
- The component is translation-driven: every visible string goes through `t()` with keys under the `stats-page.*` namespace.
- `data-test` attributes are present on every interactive element for E2E test selectors.
