---
source: tests/unit/app/router/announcer.spec.ts
sha256: d6c4c971ed390a8f48227f8c5819fb5a2b524af2c40e3a8055c61ec2e78eb46f
signature: 8204a82faa38328f8f2091dd315bbdc55c5f533ba6572ba1c6d1c2c36065fc46
generated_at: 2026-11-10T07:49:10.454957+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/announcer.spec.ts

## Purpose

Unit tests for `src/app/router/announcer.ts`, covering the live-region route announcement (`routeAnnouncement`, `announceRouteChange`) and the one-shot main-landmark focus request/consume pair (`requestMainFocus`, `consumeMainFocus`). It exists to pin down two timing-sensitive behaviours: the async clear-then-set announcement pattern and the pending-flag survival across a missing `<main>` element.

## Key elements

- **`mountMainLandmark()`** – test helper that injects a `<main data-main-content tabindex="-1">` element and returns the element plus a `vi.spyOn` on its `focus` method.
- **`beforeEach`** – resets `document.body`, clears `routeAnnouncement.value`, and calls `consumeMainFocus()` to drain the module-level pending flag so no test leaks state into the next.
- **`describe('routeAnnouncement')`** – asserts the ref starts as an empty string.
- **`describe('announceRouteChange')`** – verifies the synchronous clear → async set sequence; guards the repeated-title case where a direct ref assignment would be a Vue reactivity no-op.
- **`describe('MAIN_CONTENT')`** – confirms the `MAIN_CONTENT` selector matches only the `[data-main-content]` element.
- **`describe('consumeMainFocus')`** – covers the no-op path, the focus-with-`preventScroll` path, one-shot semantics (second call returns `false`), and the critical case where the landmark is absent on the first call but present on the second.

## Relationships

Imports all five public exports from `@/app/router/announcer` (`MAIN_CONTENT`, `announceRouteChange`, `consumeMainFocus`, `requestMainFocus`, `routeAnnouncement`). No other graph neighbours are recorded.

## Notes

- **Module-level flag reset:** `consumeMainFocus` is called in `beforeEach` because the pending flag lives in module state; a test that requests focus without consuming it would otherwise leak.
- **Order in `consumeMainFocus` is the point:** the flag is cleared *after* the landmark lookup. The test "keeps the request pending when the landmark is not in the DOM yet" exists specifically to prevent reordering.
- **`tabindex="-1"` is load-bearing:** without it the `<main>` landmark is not focusable and `focus()` is a silent no-op, which would mask a real bug.
- **`preventScroll: true` assertion:** the router has already restored scroll position; focusing without this option would yank the viewport back to the landmark.
- **Repeated-title guard:** `announceRouteChange('Products')` twice in a row must produce the mutation sequence `['Products', '', 'Products']`; a naive `ref.value = 'Products'` assignment would skip the second mutation entirely.
