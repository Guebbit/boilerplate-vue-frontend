---
source: tests/unit/app/use-focus-tooltip.spec.ts
sha256: 79e921dce1ba59dcdaac49dbbc708cf277cd661d2011b8fc327d8301b1499739
signature: 31614dc7f888053610f3f489fdfba6b5bf5675b994b50c2a297eb923498f895c
generated_at: 2026-11-10T07:51:45.670708+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/use-focus-tooltip.spec.ts

## Purpose

Unit tests for the `useFocusTooltip` composable. Verifies three behavioral contracts: the tooltip opens only on keyboard (`:focus-visible`) focus, closes asynchronously *after* the blur task completes (not during it), and exposes a `canHover` flag driven by the `(hover: hover)` media query.

## Key elements

- **`focusEvent(focusVisible: boolean)`** — local helper that returns a `FocusEvent` stub whose `target.matches` responds to the `:focus-visible` selector with the given boolean; used to simulate keyboard vs. pointer focus.
- **"opens on a keyboard focus and stays shut on a pointer focus"** — asserts `tooltipOpen` is `false` for a pointer focus event and `true` for a keyboard focus event.
- **"closes after the blur has finished, not during it"** — calls `closeTooltip()`, asserts `tooltipOpen` is still `true`, then advances fake timers and asserts it is `false`. Encodes the deferred-close contract.
- **"lets hover open the tooltip only where the device can hover"** — stubs the global `matchMedia` via `vi.stubGlobal` to confirm `canHover` mirrors the `(hover: hover)` query result; un-stubs at test end.
- **Fake timers** — `vi.useFakeTimers()` / `vi.useRealTimers()` in `beforeEach`/`afterEach` to control the deferred close.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>()`, a typed helper that marks an object as a stub (used for the `FocusEvent` and `MediaQueryList` fakes in these tests).

## Notes

- The close-deferred test relies on the implementation scheduling the close with `setTimeout` (or equivalent one-macro-task delay); `vi.runAllTimers()` is what actually triggers it. If the implementation changes its deferral mechanism, this test will break silently.
- The hover test stubs and un-stubs the global `matchMedia` *within* a single `it` block rather than in `afterEach`, so a later test adding its own stub could be affected if this test is reordered.
- `focusEvent` only implements `matches` for the `:focus-visible` selector; any other selector returns `false`. This is intentional and keeps the stub minimal.
