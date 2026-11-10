---
source: tests/e2e/specs/layout-checks.cy.ts
sha256: e579a6eb4c02ac1e52b4c22970a4f269abe35b3d1feee101d565c1b1047c4d34
signature: 3370985baf676c9141a88eea1ae7a4631e4de6c8e52aada46f711cc5d79df03c
generated_at: 2026-11-10T07:23:35.674115+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/layout-checks.cy.ts

## Purpose

End-to-end spec that validates the layout-check collector by planting deliberately wrong (and deliberately right-looking) markup into a live page and asserting the checks name exactly the right things. It proves each check can both fire and stay silent, covering overflow, clipped text, covered controls, input font size, overlay fit, text-spacing clipping, scroll-x, and the 44 px comfort tier.

## Key elements

- **`plant(html)`** — appends a `<div id="plant">` wrapper with the given HTML to `document.body` so cases have a stable handle.
- **`findingsOf(checks, extra?)`** — thin wrapper around `collectLayoutFindings`; accepts an optional `narrow` flag and a `mode` (`'normal'` | `'text-spacing'`) forwarded to the collector.
- **`about(findings, fragment)`** — filters a findings array to those whose `selector` contains the given substring.
- **`describe('catch what is wrong')`** — positive assertions: overflow, clipped text, covered button, unreachable control in a scrollable row, input font below 16 px (narrow vs. desktop), open drawer off-screen, and line clipping only under simulated text-spacing.
- **`describe('say nothing about what only looks wrong')`** — negative assertions: screen-reader-only spans, `aria-hidden` boxes, skip links, closed Vuetify drawers, ellipsis text, and intentional horizontal scrollers must not trigger false positives (scroll-x fires at `advisory` severity only).
- **`describe('the comfort tier')`** — verifies `cy.checkTargetComfort` rejects a pair of 30 px buttons 2 px apart, expecting the failure message to reference the WCAG 2.5.8 criterion.
- **`describe('the seams the sweep stands on')`** — sanity-checks `applyViewport` (phone dimensions 390×844) and `switchToDarkTheme` (phone drawer path and desktop bar path both produce `v-theme--dark`).

## Relationships

- **`scripts/e2e/layout-findings.ts`** — source of the `LayoutCheckId` and `LayoutFinding` types used throughout the spec.
- **`tests/support/e2e/layout-checks.ts`** — provides `collectLayoutFindings`, the function under test; every positive/negative case calls it via `findingsOf`.
- **`tests/support/e2e/apply-viewport.ts`** — provides `applyViewport`, called in `beforeEach` (phone-small) and in the seams suite to switch between phone and desktop sizes.
- **`tests/support/e2e/sweep-state.ts`** — provides `switchToDarkTheme`, exercised in the seams suite to confirm the dark-theme toggle works on both phone and desktop.

## Notes

- **Comfort-tier failure path:** `cy.checkTargetComfort` throws inside axe's async callback, which Cypress reports as an uncaught rejection rather than a failed command. The test registers handlers on both `cy.on('fail')` and `cy.on('uncaught:exception')` and uses a `done()` callback to bridge the two paths; a successful call is treated as a test failure.
- **`narrow` flag semantics:** `narrow: true` models a phone viewport for the `input-font` check (flags < 16 px); `narrow: false` models desktop (same markup is acceptable).
- **Text-spacing simulation:** the spec injects a `<style>` rule (`line-height: 1.5 !important; letter-spacing: 0.12em !important`) *before* re-running the clipped check with `mode: 'text-spacing'`, mimicking a user's browser accessibility setting rather than relying on the `mode` flag alone.
- **Visit target:** all cases run against `/en` and gate on `h1` existing before planting.
- **`requires-module: none`** — the file declares no special runtime module dependency.
