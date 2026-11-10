---
source: src/modules/account/tests/use-password-strength.spec.ts
sha256: 5e45849c2645ee0a8a3d1aedb0a9c9cc5effcfafb2abd2283eec1ea9744d119c
signature: d9308873245299256b6004033cce3ae10ef295da6e2b301e2cad5b257a04c68d
generated_at: 2026-11-10T03:44:21.044151+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-password-strength.spec.ts

## Purpose

Vitest spec for the `usePasswordStrength` composable. Verifies that the composable delegates scoring to zxcvbn, short-circuits (clearing the score without calling zxcvbn) when the password is empty, and re-scores when the password value changes.

## Key elements

- **`check`** (module-level `vi.fn()`) — stub for zxcvbn's `check` method; each test sets its return value and asserts call arguments.
- **`vi.mock('@zxcvbn-ts/core', …)`** — replaces `ZxcvbnFactory` with a mock constructor that returns `{ check }`. Prevents loading the full dictionary modules.
- **`vi.mock('@zxcvbn-ts/language-common', …)` / `vi.mock('@zxcvbn-ts/language-en', …)`** — provide empty `dictionary` / `adjacencyGraphs` / `translations` so the mocked factory's import chain resolves without side-effects.
- **`describe('usePasswordStrength')`** — three `it` blocks covering: (1) scoring a non-empty password, (2) empty-password short-circuit (`toBeUndefined()` on score, `check` not called), (3) rescoring after a value change (new score, `check` called with new value).

## Relationships

- **`src/modules/account/composables/use-password-strength.ts`** — the unit under test; imported directly and exercised via its `password` ref and returned `score` ref.
- **`@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en`** — all mocked at the module level; the tests never load the real zxcvbn dictionaries.

## Notes

- The `ZxcvbnFactory` mock is written as a **named function expression** (`function zxcvbnFactoryMock() { … }`) rather than an arrow, because the real export is invoked with `new`. An arrow function would throw at runtime if the composable ever called it that way.
- All three tests rely on `vi.waitFor` to observe reactive updates (the composable presumably uses `watch`/`watchEffect` on the password ref). Synchronous assertions immediately after setting `password.value` would be flaky.
- The empty-password test asserts `score.value` via `toBeUndefined()`, confirming the composable treats "no input" as an absent score rather than a numeric value.
