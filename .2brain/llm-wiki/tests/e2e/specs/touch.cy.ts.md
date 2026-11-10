---
source: tests/e2e/specs/touch.cy.ts
sha256: 463c79a4d40b7d5c1163e95943cb6323060f04339b00ca72de867fd6cff845c2
signature: 105bd13c683398dafef452c0fe821fb6e974605b40a089ea9a05715783fa3b2d
generated_at: 2026-11-10T07:25:08.020056+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/touch.cy.ts

## Purpose

Validates the touch contract of the shell UI: that CDP touch emulation flips the relevant media queries (`hover`, `pointer`, `ontouchstart`) and that real finger interactions (taps, swipes) via `cypress-real-events` work on phone and tablet viewports. Covers the app drawer, user/admin menus, tooltips, language switcher, notifications, and a final "scan" that flags controls or data reachable only by hover.

## Key elements

- **`mediaMatches(query)`** – answers a CSS media query inside the app's own window (`win.matchMedia`).
- **`SHOWN_TOOLTIP`** – selector for active Vuetify tooltip content (`.v-overlay--active .v-overlay__content`).
- **`FIRST_MENU_ENTRY`** – selector for the first `[role=menuitem]` inside an active overlay.
- **`describe('on a desktop')`** – sanity-checks that hover + fine pointer are reported.
- **`describe('on a phone')`** – verifies coarse-pointer/none-hover queries, `ontouchstart`, `maxTouchPoints`; drawer open via tap and edge-swipe; scrim close; per-entry tappability.
- **`describe('menus and tooltips')`** – loops over phone/tablet × user/admin to tap-open menus and assert no tooltip rectangle overlaps the first entry; pinned cart entry; language switch; notifications bell.
- **`describe('the scan')`** – injects synthetic hidden/cut-off probes into the DOM, runs `collectTouchProbes → classifyTouchProbes → gatedFindings`, expects both failure kinds to be caught, then removes them and expects a clean pass.

## Relationships

- **`scripts/e2e/touch-findings.ts`** – exports `classifyTouchProbes` and `gatedFindings`; consumed in the scan test to turn raw probes into pass/fail verdicts.
- **`tests/support/e2e/apply-viewport.ts`** – exports `applyViewport(size)`; called per test to enable CDP touch emulation for `phone`, `tablet`, `phone-small`, or `desktop`.
- **`tests/support/e2e/touch.ts`** – exports `collectTouchProbes(win)`; walks the live DOM to gather candidate touch-inaccessible elements for the scan test.

## Notes

- **Ordering is load-bearing.** Touch suites must appear *after* desktop in the spec file: in live Chromium the post-touch reset falls back to "no pointer," so a desktop test that follows a touch test would lose its mouse.
- **`applyViewport` before the visit** is required for the first phone test so that `ontouchstart` exists on the freshly loaded document; later tests call it after the visit.
- **Swipe edge math.** Vuetify opens the end-side drawer only for a swipe starting within 25 px of the *document* right edge; a classic scrollbar makes that narrower than the window, so the test reads `clientWidth` rather than `innerWidth`.
- **Tooltip overlap check** uses bounding-rectangle intersection, not hit-testing, because tooltip content is `pointer-events: none` and would never intercept a real tap.
- Runs under the demo profile in `ci.yml`, like every other E2E spec.
