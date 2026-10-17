---
source: src/modules/stats/tests/stats-period-form.spec.ts
sha256: 50bc5ce763cc9b99c3c5073e834793c0a6a039fe2a4a8dde68c6fcf351a068bc
generated_at: 2026-10-17T01:44:24.372958+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/stats-period-form.spec.ts

## Purpose

Vitest suite that exercises the `StatsPeriodForm` component's public contract: it can apply the period it was handed, rejects invalid ranges with a visible explanation and a disabled submit button, auto-widens the bucket size as the range grows, applies a preset immediately, and stays in sync when the parent changes the `modelValue` prop.

## Key elements

- **`CURRENT`** — a fixed `StatsPeriodChoice` fixture (Sep 2026, `day` interval) used as the default prop value.
- **`mountForm(period?)`** — mounts `StatsPeriodForm` with the real Vuetify and i18n plugins; accepts an optional period override.
- **`applied(wrapper)`** — extracts the array of `apply` event payloads from a `VueWrapper`, typed as `StatsPeriodChoice[]`.
- **`beforeEach → loadLocale('en')`** — loads the English locale so assertion strings match the component's i18n keys.
- **Six `it` blocks** covering: round-trip apply, reversed-range rejection, >2-year rejection, "last 7" preset (6-day span, ISO date), bucket widening to `week` when the range grows, and external prop reactivity.

## Relationships

- **`StatsPeriodForm.vue`** — the component under test; the suite mounts it and drives its inputs via `data-test` selectors.
- **`domain/index.ts`** — barrel from which the `StatsPeriodChoice` type is imported for fixture typing.
- **`domain/period.ts`** — defines the `StatsPeriodChoice` shape (`from`, `to`, `interval`) that the fixture and assertions rely on.
- **`wire-modules.ts`** — called once before the component is exercised to register any module-level dependencies (e.g., a period-validation service) into the component's injection context.

## Notes

- Tests use `.then()` promise chains rather than `async/await`, matching Vue Test Utils' promise-based `trigger`/`setValue` API.
- Validation messages are asserted by English substring (e.g. `"must not be after"`, `"two years"`), so they are coupled to `loadLocale('en')` in `beforeEach`.
- The "last 7" preset is asserted as a **6-day** span (`to − from === 6 * 86_400_000`), meaning `from` and `to` are inclusive endpoints.
- `wireModulesIntoCore()` is invoked as a side-effect before the `import type` line; the ordering is intentional to ensure DI is ready before any test runs.
