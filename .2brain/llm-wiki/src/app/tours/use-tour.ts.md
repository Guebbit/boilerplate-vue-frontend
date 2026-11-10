---
source: src/app/tours/use-tour.ts
sha256: f2495a782b3ee814c5bbfcf0abd5eaca54586a0dad5f53996b26576952a5f8b0
signature: e8db07ac7f083b64ec86d5c7ca32ac946db857946e4e2c1932650d5a55a57b0c
generated_at: 2026-11-10T02:57:44.551094+00:00
model: ollama:qwen3.8:27b
---

# src/app/tours/use-tour.ts

## Purpose

The single integration point for the `driver.js` library. It exposes a `useTour()` composable that assembles, translates, and displays a tour identified by catalogue id—lazily loading driver.js and its stylesheet on first use so neither joins the boot bundle. It also handles anchor-waiting, seen-state tracking per account and tour version, and a single-active-tour guard.

## Key elements

- **`isAnchorVisible(target)`** – Exposed helper. Returns `true` when the step's DOM element exists *and* is visually painted (uses `checkVisibility` when available, falls back to mere DOM presence for older engines / jsdom).
- **`useTour()`** – The composable entry point. Binds the current i18n translator and session store, then returns:
  - **`startTour(tourId)`** – Validates (tours enabled, known id, no tour already open), polls up to 5 s for at least one anchor to appear, dynamically imports `driver.js` + its CSS, records the tour as seen *on open* (not close), instantiates and drives the tour. Returns `false` (resolves, no throw) when any guard fails.
  - **`hasSeen(tourId)`** – Checks localStorage (via `hasSeenTour`) with a key that includes the viewer id and the tour's version.
- **`ANCHOR_POLL_MS` / `ANCHOR_WAIT_MS`** – Constants: 100 ms poll interval, 5 000 ms deadline before giving up on anchors silently.
- **`active`** – Module-level singleton guard ensuring only one tour is open at a time. Set during the anchor-wait phase so a same-tick second request is dropped.
- **`seenKeyOf(tourId)`** – Builds the persistence key from `session.viewer?.id`, the tour id, and `TOURS[tourId].version`.

## Notes

- Seen-state is written **on open**, not on close. A page reload mid-tour will not re-trigger the tour.
- The `active` guard is set *before* the anchor-poll begins, so two calls in the same tick (e.g. auto-open + `?tour=` param) won't stack.
- `progressText` mixes driver.js template tokens (`{{current}}`, `{{total}}`) with a vue-i18n translation because vue-i18n cannot interpolate driver.js placeholders.
- If no anchor ever appears within 5 s, `startTour` resolves `false` silently—no user-visible error.
- The file is intentionally the sole driver.js consumer; other files should import from here (or from `catalogue.ts`) rather than from driver.js directly.
