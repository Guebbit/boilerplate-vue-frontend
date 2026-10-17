---
source: src/modules/account/tests/use-password-breach-check.spec.ts
sha256: e6da894cbd57aa8c601625b51c5831ed95834f9ba2e45bb0cf04961070d80b2b
generated_at: 2026-10-17T00:28:22.857769+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-password-breach-check.spec.ts

## Purpose

Vitest spec for the `usePasswordBreachCheck` composable. Verifies that rapid keystrokes produce a single debounced API call, that pending checks are cancelled on scope disposal or empty input, that the breach flag reflects the server verdict without alarming on failures, and that stale responses are discarded in favor of newer ones.

## Key elements

- **`DELAY`** (const, 500) — the debounce interval the tests advance via fake timers; mirrors the value passed to the composable under test.
- **`envelope(breached)`** (helper) — returns a resolved `Promise<PasswordCheckEnvelope>` shaped like the real success response, parameterised by breach status.
- **`describe('debouncing')`** — three tests: single request for a burst of keystrokes; cancellation when the owning `effectScope` is stopped; cancellation and flag-reset when the field is cleared to `''`.
- **`describe('the verdict')`** — three tests: `breached` flag set on a positive server answer; flag stays `false` when the API rejects (advisory-only contract); stale (slow) response dropped when a newer request has already resolved.
- **`vi.mock('@api', …)`** — module-level mock replacing `checkPasswordBreached` with a `vi.fn()`, so no real HTTP is ever issued.
- **Fake-timer lifecycle** — `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`; every assertion after a debounce window uses `vi.advanceTimersByTimeAsync(DELAY)`.

## Relationships

- **`src/modules/account/composables/use-password-breach-check.ts`** — the system under test; this file imports `usePasswordBreachCheck` and exercises every public contract (the `check` function, the `breached` ref, scope-aware cancellation, stale-response suppression).
- **`@api` (mocked)** — the `checkPasswordBreached` function is replaced at module level; no real network call is made. The spec asserts call arguments (`{ password: … }`) and return/rejection behaviour.
- **`@types`** — imports the `PasswordCheckEnvelope` type used to shape the mock envelope helper.

## Notes

- The module doc comment explicitly states the fake-timers rationale: the debounce delay *is* the behaviour under test, so real `setTimeout` waits would make the suite slow and flaky. The same pattern is referenced in `cart/tests/use-line-quantity.spec.ts`.
- The "stale response" test manually controls promise resolution order (capturing `resolve` from the first mock implementation) to simulate a slow first response landing after a fast second one. This is the only test that uses `flushPromises` from `@vue/test-utils`; all others rely solely on the fake-timer advance.
- `effectScope` (from `vue`) is used in one test to verify that stopping the scope cancels a pending debounced call — this exercises the composable's internal `onScopeDispose`-style cleanup rather than any public "cancel" method.
