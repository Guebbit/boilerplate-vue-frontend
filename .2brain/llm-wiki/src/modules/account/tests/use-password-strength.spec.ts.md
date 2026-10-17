---
source: src/modules/account/tests/use-password-strength.spec.ts
sha256: 5e45849c2645ee0a8a3d1aedb0a9c9cc5effcfafb2abd2283eec1ea9744d119c
generated_at: 2026-10-17T00:28:31.303902+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-password-strength.spec.ts

## Purpose

Vitest spec that verifies `usePasswordStrength` correctly delegates scoring to zxcvbn, clears the score when the password is emptied, and re-scores on subsequent changes. It exists to lock in the composable's contract so the dynamic-import lazy-loading strategy and empty-string short-circuit remain intact.

## Key elements

- **`check`** — A `vi.fn()` stub that stands in for zxcvbn's scoring function; each test sets a canned return value on it.
- **`vi.mock('@zxcvbn-ts/core', …)`** — Replaces `ZxcvbnFactory` with a named-function mock (see Notes) that returns `{ check }`, so the test can assert call arguments.
- **`vi.mock('@zxcvbn-ts/language-common', …)` / `vi.mock('@zxcvbn-ts/language-en', …)`** — Supply empty `dictionary` / `adjacencyGraphs` / `translations` objects to satisfy the composable's imports without loading real language data.
- **`describe('usePasswordStrength')`** — Three `it` blocks covering: non-empty scoring, empty-password reset (asserting `check` is *not* called), and re-scoring after a value change.

## Relationships

- **`src/modules/account/composables/use-password-strength.ts`** — The sole unit under test. The spec imports `usePasswordStrength` and exercises its returned `score` ref against a `ref` password input. All zxcvbn modules the composable imports are mocked away so the test runs without the real (dynamically-imported) scoring engine.

## Notes

- The `ZxcvbnFactory` mock is declared as a **named function** (`function zxcvbnFactoryMock()`), not an arrow, because the real export is invoked with `new`. An arrow-function mock would throw a `TypeError` at construction time.
- Assertions use `vi.waitFor` rather than synchronous `expect` after setting `password.value`, indicating the composable updates `score` asynchronously (e.g. via a `watch` or microtask-scheduled dynamic import).
- The empty-password test asserts `check` was **not** called, confirming the composable short-circuits before reaching zxcvbn — a behavior that would silently break if the short-circuit were removed.
