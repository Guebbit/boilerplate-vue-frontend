---
source: src/modules/account/tests/password-strength-meter.spec.ts
sha256: 462de83c70190cebb8a14771fb0c9bdf3cac1ede4ce6a197094fed5bb866bc76
generated_at: 2026-10-02T12:27:07.560401+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-strength-meter.spec.ts

## Purpose
Unit tests for `PasswordStrengthMeter.vue`. Verifies three behavioral contracts: the component renders nothing for an empty password, displays a bar + label when a strength score is present, and explicitly does **not** render a breach warning (that responsibility belongs to a separate component driven by `use-password-breach-check.ts`).

## Key elements
- **`score`** — a `ref<0|1|2|3|4|undefined>` that acts as the single control point for the mocked composable; each test sets `score.value` before mounting.
- **`vi.mock('@/modules/account/composables/use-password-strength.ts', …)`** — hoisted mock that makes `usePasswordStrength()` always return `{ score }`, decoupling the component under test from real strength-scoring logic.
- **`mountMeter(password: string)`** — thin wrapper around `@vue/test-utils` `mount` that injects the `i18n` and `vuetify` plugins, keeping the three test bodies focused on assertions.
- **`describe('PasswordStrengthMeter', …)`** — three `it` blocks: empty-password renders nothing, score 4 renders bar + "Strong" label, and no `[data-test="password-breached-warning"]` element ever appears.

## Relationships
- **`tests/support/unit/wire-modules.ts`** — imports `wireModulesIntoCore()` and calls it at module scope (before any test runs) so that the DI/module registry is available to the component and its transitive imports during mounting.

## Notes
- The file's top-of-file comment is an intentional boundary declaration: breach warnings are a *sibling* component's job, not this meter's. The third test exists to guard against that boundary being silently crossed.
- `score` is a plain `ref` (not a `computed`), so tests can freely reassign `.value` between cases without re-mocking.
- `loadLocale('en')` is awaited inside the two tests that assert on rendered text; the third test skips it because it only checks for a selector's absence.
