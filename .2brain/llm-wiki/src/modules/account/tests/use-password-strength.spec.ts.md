---
source: src/modules/account/tests/use-password-strength.spec.ts
sha256: 795a4e2cd3bfaf55b89f90dddfa2afa3449764062cfea2a1823498ea77be66fc
generated_at: 2026-10-02T12:34:20.860905+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-password-strength.spec.ts

## Purpose
Vitest spec for the `usePasswordStrength` composable. Verifies that the composable delegates to zxcvbn for scoring, clears the score (without calling zxcvbn) when the password is emptied, and re-queries zxcvbn when the password value changes.

## Key elements
- **`check`** — `vi.fn()` standing in for the zxcvbn `check` method; every assertion about "zxcvbn was/wasn't called" reads from it.
- **`vi.mock('@zxcvbn-ts/core')`** — replaces `ZxcvbnFactory` with a mock constructor whose instance exposes only `{ check }`. Uses a **named function** (not an arrow) because the real factory is invoked with `new`.
- **`vi.mock('@zxcvbn-ts/language-common')` / `vi.mock('@zxcvbn-ts/language-en')`** — stub out the dictionary/adjacency/translation exports so no real dictionary data is loaded.
- **`describe('usePasswordStrength')`** — three `it` blocks:
  - *scores a non-empty password via zxcvbn* — sets a password on a `ref`, expects `score.value` to update and `check` to be called with that string.
  - *clears the score for an empty password, without asking zxcvbn* — resets the ref to `''`, expects `score` to become `undefined` and `check` to have **not** been called again.
  - *rescoring a changed password asks zxcvbn again with the new value* — changes the ref to a second value, expects a new `check` call and a different score.

## Relationships
- **`@/modules/account/composables/use-password-strength.ts`** — the module under test; the spec imports `usePasswordStrength` and drives it with a Vue `ref`.
- **`@zxcvbn-ts/core`, `@zxcvbn-ts/language-common`, `@zxcvbn-ts/language-en`** — mocked at the module level so no real zxcvbn logic executes.

## Notes
- All three tests use `vi.waitFor` for the score assertion, reflecting that the composable computes the score **asynchronously** (consistent with the dynamic-import-on-first-use strategy noted in the file header comment).
- The mock factory must be a named `function` expression, not an arrow, because the composable (or its internal helper) constructs it with `new`. An arrow-function mock would throw a `TypeError` at runtime.
- The empty-password test calls `check.mockClear()` *after* the initial score is settled, isolating the "no second call" assertion from the first scoring pass.
