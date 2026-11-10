---
source: src/modules/stats/tests/stats-period-form.spec.ts
sha256: f6a762aa83ddc77f4a4d5b4f65719bb69b3365fd1d476c736dd27cdf294d0979
signature: fccc5ba272935de1d95fd044f28debd2023b3ad79c7d94bf9274378615dc9667
generated_at: 2026-11-10T05:52:23.349865+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/stats-period-form.spec.ts

## Purpose

Unit test suite for the `StatsPeriodForm` component. It verifies that the form correctly applies a valid period, rejects invalid ranges (reversed dates, over-length ranges) with a visible error and a disabled submit button, applies presets instantly, auto-widens the bucket interval when the range grows, and stays in sync when the parent changes `modelValue` externally.

## Key elements

- **`CURRENT`** – Fixture `StatsPeriodChoice` (Sept 2026, `day` interval) used as the default mount prop.
- **`mountForm(period?)`** – Mounts `StatsPeriodForm` with real Vuetify and i18n plugins, passing `modelValue` and `limits` (`maxRangeDays: 731`, `maxBuckets: 400`).
- **`applied(wrapper)`** – Extracts the array of `apply` events the form has emitted (returns `[]` if none).
- **`wireModulesIntoCore()`** – Called once at module top-level to register domain modules before the component's runtime resolves them.
- **`describe('StatsPeriodForm')`** – Six `it` blocks covering: submit-as-given, reversed-range rejection, over-ceiling rejection, preset click (last-7), bucket auto-widening to `week`, and external prop update.

## Relationships

- **`src/modules/stats/components/StatsPeriodForm.vue`** – The SUT. Mounted via `@vue/test-utils`; tested through its `data-test` DOM attributes and its `apply` emit.
- **`src/modules/stats/domain/index.ts`** – Re-exports `StatsPeriodChoice`, the type used for the `modelValue` prop and the event payload.
- **`src/modules/stats/domain/period.ts`** – Likely the defining module for `StatsPeriodChoice` (reached via the domain barrel).
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, a side-effect call that wires domain modules into the component's core before the test runs.

## Notes

- `wireModulesIntoCore()` is invoked **before** the `import type` of `StatsPeriodChoice`; this is a deliberate ordering so the component's runtime dependency graph is ready when `mount` executes.
- Tests select elements exclusively by `data-test` attributes (`stats-period-form`, `stats-from`, `stats-period-problem`, `stats-apply`, `stats-preset-last-7`), not by CSS class or tag.
- The component communicates via a custom `apply` event rather than `update:modelValue`, so the parent is expected to listen for `@apply`.
- `loadLocale('en')` runs in `beforeEach` to guarantee i18n strings are loaded before assertions on error text (e.g., "must not be after", "at most 731 days").
- The bucket-widening test only asserts the interval becomes `week`; it does not pin the exact date arithmetic, leaving room for timezone-safe implementation changes.
