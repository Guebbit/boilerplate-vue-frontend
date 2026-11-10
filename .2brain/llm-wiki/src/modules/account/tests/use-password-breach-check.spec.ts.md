---
source: src/modules/account/tests/use-password-breach-check.spec.ts
sha256: 0da05624d77881b58c6c23daae52da0e72d2e37971b5ac8b5a035abacebf86b9
signature: 425eadbd75dcbbd7a9c2ba876cc43f262aad021d9ccfb535d9fcffbfde8e96e7
generated_at: 2026-11-10T03:44:06.064101+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-password-breach-check.spec.ts

## Purpose

Vitest suite that verifies the debounce and verdict semantics of the `usePasswordBreachCheck` composable. It uses fake timers because the 500 ms delay is the behaviour under test; a real wait would make the suite both slow and flaky.

## Key elements

- **`DELAY`** – constant (500 ms) used with `vi.advanceTimersByTimeAsync` to trigger the debounced call.
- **`envelope(breached)`** – returns a resolved `Promise<PasswordCheck>` for a given breach flag.
- **`useCheck()`** – runs `usePasswordBreachCheck(DELAY)` inside a per-test `EffectScope`, mirroring a component `setup` call.
- **`describe('debouncing')`** – three cases:
  - A burst of keystrokes produces exactly one API call with the final value.
  - Disposing the scope (form unmount) cancels the pending check.
  - Passing an empty string cancels the pending check and resets `breached` to `false`.
- **`describe('the verdict')`** – three cases:
  - `breached` flips to `true` once the server answers affirmatively.
  - A rejected (network) response leaves `breached` at `false` (advisory-only contract).
  - A stale, slow response is ignored when a newer, faster response has already resolved.
- **`vi.mock('@api', …)`** – mocks `checkPasswordBreached` for the entire module.

## Relationships

- **`src/modules/account/composables/use-password-breach-check.ts`** – the unit under test; imported via the relative path `../composables/use-password-breach-check.ts`. All assertions target its returned `check` function and `breached` ref.

## Notes

- An `EffectScope` is mandatory per test because the composable calls `onScopeDispose`; outside a scope Vue emits a warning that would fail the case. The scope is created in `beforeEach` and stopped in `afterEach`.
- The stale-response test (`drops an answer superseded…`) uses `mockImplementationOnce` with a manually-resolvable promise to simulate a first call that resolves *after* the second call's faster answer has already landed, exercising the composable's internal cancellation/guard logic.
- The suite follows the same fake-timers pattern as `cart/tests/use-line-quantity.spec.ts` (referenced in the module docblock).
