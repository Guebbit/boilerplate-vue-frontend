---
source: tests/unit/app/use-focus-tooltip.spec.ts
sha256: f31412dfa3924f209034c7df7ff891ea9f7150a3af2c6ea6b2eab7a449102b97
generated_at: 2026-10-17T02:32:52.922872+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/use-focus-tooltip.spec.ts

## Purpose

Unit tests for the `useFocusTooltip` composable, verifying two critical behaviors: the nav tooltip opens only on keyboard (focus-visible) focus and closes asynchronously after blur completes—never synchronously during blur, which would cause Vuetify to steal focus back and trap Tab in the top bar.

## Key elements

- **`focusEvent(focusVisible)`** — local helper that builds a minimal `FocusEvent` stub via `asStub`, where `target.matches(':focus-visible')` returns the given boolean.
- **`describe('useFocusTooltip')`** — test suite with `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`, enabling deterministic assertion of the deferred close.
- **`'opens on a keyboard focus and stays shut on a pointer focus'`** — asserts `tooltipOpen` stays `false` for a pointer-focus event and flips to `true` for a focus-visible event.
- **`'closes after the blur has finished, not during it'`** — calls `closeTooltip()`, asserts `tooltipOpen` is still `true`, then runs all fake timers and asserts it is `false`.

## Relationships

- **`tests/support/stub.ts`** — supplies `asStub<T>(partial)`, which lets the tests cast a hand-rolled partial object to a full `FocusEvent` without `any`. The helper keeps the mock surface minimal (only `target.matches` is exercised).
- **`@/app/components/use-focus-tooltip.ts`** — the composable under test; exports `useFocusTooltip` returning `{ tooltipOpen, openTooltipOnRealFocus, closeTooltip }`.

## Notes

- The close-delay behavior is the whole point of the composable: `closeTooltip` must defer (e.g., via `queueMicrotask`/`setTimeout`) so that the `blur` handler's synchronous frame has already finished before focus can be reassigned. The test relies on `vi.runAllTimers()` to advance past that deferral.
- The `focusEvent` helper only implements `target.matches`; any other property access on the event would throw, keeping the tests tightly scoped.
