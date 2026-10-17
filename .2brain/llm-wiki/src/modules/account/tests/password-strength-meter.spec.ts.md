---
source: src/modules/account/tests/password-strength-meter.spec.ts
sha256: 65e7771931537622c177707731b56278f1dbf8c53bd71e42d2df03cbc1eec464
generated_at: 2026-10-17T00:23:59.448080+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-strength-meter.spec.ts

## Purpose

Vitest unit test for `PasswordStrengthMeter.vue`. Verifies three contracts: the meter is absent for an empty password, it renders a bar + label once a score exists, and it **never** renders a breach warning (that responsibility belongs to a separate component).

## Key elements

- **`score`** — a `Ref<0|1|2|3|4|undefined>` shared across tests; serves as the controllable return value of the mocked composable.
- **`vi.mock('../composables/use-password-strength.ts')`** — replaces `usePasswordStrength` so it returns `{ score }`, letting each test set `score.value` directly.
- **`mountMeter(password)`** — helper that mounts the component with the `password` prop and global plugins (`i18n`, `vuetify`).
- **`describe('PasswordStrengthMeter')`** — three `it` blocks asserting the behaviors listed above, using `[data-test]` attributes as selectors.

## Relationships

- **`src/modules/account/components/PasswordStrengthMeter.vue`** — the component under test; imported and mounted in every case.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module scope to register module-level wiring required by the component's transitive dependencies before any test runs.
- **`../composables/use-password-strength.ts`** — mocked out; the real composable is never executed.

## Notes

- The file's top-level doc comment is a deliberate design guard: the password-breach hint is rendered by a *separate* component (from `use-password-breach-check.ts`), not duplicated inside this meter. The third test enforces this boundary.
- Tests select via `data-test` attributes rather than class names, keeping the suite decoupled from styling changes.
- `loadLocale('en')` is awaited before assertions that check rendered text, ensuring i18n strings are available.
