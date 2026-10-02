---
source: src/modules/account/tests/use-password-breach-check.spec.ts
sha256: d884d63ed67c24a70aad747e8437e8453223724014d2a5229d5750249d8715ec
generated_at: 2026-10-02T12:34:01.489635+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-password-breach-check.spec.ts

## Purpose

Vitest spec for the `usePasswordBreachCheck` composable. It verifies the debounce logic (one API call per keystroke burst), the reactive `breached` flag, and edge cases like scope disposal, empty input, network failure, and stale-response ordering. Fake timers are used because the 500 ms delay is the subject under test—a real wait would slow the suite and introduce flakiness.

## Key elements

- **`DELAY` (500)** – The debounce window passed to the composable in every test.
- **`envelope(breached)`** – Helper that builds a resolved `PasswordCheckEnvelope` promise so tests don't repeat the success-envelope shape.
- **`vi.mock('@api', …)`** – Module-level mock of `checkPasswordBreached`, reset in `beforeEach`.
- **`describe('debouncing')`** – Three tests:
  - A rapid `check('p')→check('pa')→check('pas')` burst produces exactly one API call with the final value.
  - Disposing the owning `effectScope` cancels the pending timer and prevents the call.
  - Calling `check('')` after `check('password1')` cancels the pending call and resets `breached` to `false`.
- **`describe('the verdict')`** – Three tests:
  - `breached` becomes `true` when the server reports a breach.
  - A rejected promise (network error) leaves `breached` at `false` — advisory-only, no alarm.
  - A stale (slower) breached response that resolves after a newer clean response is discarded; `breached` stays `false`. Uses `mockImplementationOnce` + manual `resolveFirst` to control resolution order.

## Relationships

No graph neighbors are recorded for this file. Direct imports visible in the source:

- `usePasswordBreachCheck` (`@/modules/account/composables/use-password-breach-check.ts`) — the unit under test.
- `checkPasswordBreached` (`@api`) — mocked at module level.
- `PasswordCheckEnvelope` (`@types`) — type-only import for the envelope helper.
- `effectScope` (`vue`) — used to test scope-disposal cancellation.
- `flushPromises` (`@vue/test-utils`) — used in the stale-response test to drain microtasks.

## Notes

- Fake timers (`vi.useFakeTimers` / `vi.useRealTimers`) are toggled in `beforeEach`/`afterEach`; every test that advances time uses `vi.advanceTimersByTimeAsync` rather than `vi.advanceTimersByTime` so the mock's internal `setTimeout` callback runs in the same tick.
- The stale-response test manually controls when the first (breached) promise resolves via a captured `resolveFirst` closure, then calls `flushPromises()` to let the composable's `.then` handler run—without that extra flush the assertion would be racy.
- The file follows the same fake-timers pattern as `cart/tests/use-line-quantity.spec.ts` (noted in the module doc comment).
