---
source: src/modules/account/tests/password-strength-meter.spec.ts
sha256: 65e7771931537622c177707731b56278f1dbf8c53bd71e42d2df03cbc1eec464
signature: 8f5cb9d34757549681b536641050d33fb4fd4ed5dc89ff9792ea6aed7312be9b
generated_at: 2026-11-10T03:37:45.099832+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-strength-meter.spec.ts

## Purpose

Vitest spec for `PasswordStrengthMeter.vue`. Verifies three rendering contracts: an empty password produces no DOM node, a scored password shows the strength bar and label, and the component never renders a breach warning (that belongs to a separate component).

## Key elements

- **`score`** — a module-level `ref<0|1|2|3|4>()` that backs the mocked `usePasswordStrength` composable; tests set `.value` before mounting to simulate different strength levels.
- **`vi.mock('../composables/use-password-strength.ts', …)`** — replaces the real composable so no actual hashing/zxcvbn runs; the mock always returns `{ score }` (the shared ref).
- **`mountMeter(password: string)`** — helper that mounts the component with a given `password` prop and registers the `i18n` + `vuetify` plugins globally.
- **`describe('PasswordStrengthMeter')`** — three `it` blocks covering the contracts listed in Purpose.

## Relationships

- **`src/modules/account/components/PasswordStrengthMeter.vue`** — the SUT imported and mounted by every test case.
- **`tests/support/unit/wire-modules.ts`** — its `wireModulesIntoCore()` is called once at module scope before any test runs, presumably to resolve Vite/vitest module-graph quirks (alias `@/…`, shared stores) so imports inside the component resolve correctly under the test runner.

## Notes

- The file lives under `src/modules/account/tests/` rather than a top-level `tests/` directory, but it still imports the shared helper via the relative path `../../../../tests/support/unit/wire-modules.ts` — the `wire-modules.ts` neighbor is the *root-level* one, not a local copy.
- `score` is a **shared mutable ref** across all three tests; each `it` must set `score.value` before mounting. There is no per-test reset, so test order matters if the suite is ever changed.
- The doc comment at the top explicitly states the breach warning is **not** this component's responsibility (it lives in `use-password-breach-check.ts`'s hint). The third test asserts this as a regression guard.
- `loadLocale('en')` is awaited inside the tests that need translated strings; the third test (no breach warning) skips it because no text content is asserted.
