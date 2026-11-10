---
source: tests/support/e2e/a11y-sweep.ts
sha256: 6f28930aa95c3568463176d268144ab49120ed0b733d9014e75826ea0453d317
signature: 246f0b7cd93adb36f193049b4078e9005565f884138cfd3dd68f7264137ba027
generated_at: 2026-11-10T07:26:11.363020+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/a11y-sweep.ts

## Purpose

Shared helper that runs one accessibility and layout sweep across a set of routes at a given authentication level. It lives in `tests/support/` so that every module's `a11y.cy.ts` spec can import it without re-implementing the audit loop, while remaining free of any domain-specific route list — callers supply their own routes, keeping coverage co-located with the module that owns them.

## Key elements

- **`A11ySweepCase`** (exported interface) — one audited state of one route: `name`, `route`, optional `prepare` (Cypress commands run after load, before axe), optional `theme: 'dark'`, optional `viewport`, optional `layout` (narrows the layout matrix or opts into single-element checks).
- **`A11ySweepRoute`** (exported type) — re-export of `SweepRoute`; a path string or a function that resolves one at runtime.
- **`sweepA11y`** (exported function) — the main entry point. Accepts a label, an array of terse `[name, route]` tuples or full `A11ySweepCase` objects, and an optional `E2ERole`. In audit mode it creates one `it()` per case; in capture mode it creates one `it()` per planned shot.
- **`auditAt`** (internal) — runs `cy.checkLayout`, `cy.checkTargetComfort` (phone widths), `cy.checkPageA11y` (phone only), `cy.checkTouchReachable`, and a text-mode overflow/clipped re-check at the given viewport size.
- **`sweepLayout`** (internal) — iterates over the viewport matrix (or a single pinned size), resizing in place via `applyViewport` to preserve `prepare` state.
- **`captureA11y`** / **`captureShot`** (internal) — capture-mode path: expands cases into planned shots via `expandCaptureCases`, then photographs each shot with `cy.captureDesign`.
- **`MATRIX_ORDER`** — canonical viewport order: desktop → tablet → phone-landscape → phone → phone-small.
- **`TOUCH_SCAN_SIZE`** — `'phone-small'`; the touch-reach scan runs once at this size (or at a case's pinned touch viewport).

## Relationships

- **`scripts/e2e/layout-findings.ts`** — provides `sizesFor`, `TEXT_MODE_AT`, `assertCaseOptions`, and the `LayoutCaseOptions` type; defines the layout matrix this sweep walks.
- **`scripts/e2e/viewports.ts`** — provides `VIEWPORTS` (width/touch metadata per size) and `ViewportName`; used for narrow-width checks and the `isNarrow` guard.
- **`scripts/audit/design-manual/scripts/capture-matrix.ts`** — provides `expandCaptureCases`, `moduleOfSpec`, `withLocale`, `PlannedShot`, and `DEFAULT_LOCALE`; drives the capture-mode shot expansion.
- **Module a11y specs** — `src/modules/account/tests/e2e/a11y.cy.ts`, `src/modules/api-keys/tests/e2e/a11y.cy.ts`, `src/modules/cart/tests/e2e/a11y.cy.ts`, `src/modules/example/tests/e2e/a11y.cy.ts`, `src/modules/inventory/tests/e2e/a11y.cy.ts`, `src/modules/locales/tests/e2e/a11y.cy.ts`, `src/modules/observability/tests/e2e/a11y.cy.ts`, `src/modules/orders/tests/e2e/a11y.cy.ts`, `src/modules/payments/tests/e2e/a11y.cy.ts`, `src/modules/products/tests/e2e/a11y.cy.ts`, `src/modules/returns/tests/e2e/a11y.cy.ts`, `src/modules/stats/tests/e2e/a11y.cy.ts` — the sole consumers. Each imports `sweepA11y` and `A11ySweepCase` and passes its own route list. No module is named inside this file.

## Notes

- **Gate is intentionally narrow.** `cy.checkPageA11y` fails on `serious` and `critical` axe impact only; advisory and minor findings are still written to `reports/a11y/` but do not fail the run.
- **No central route list.** The file deliberately avoids importing any module's routes. A separate spec (`tests/cross-cutting/a11y-coverage.spec.ts`) cross-checks that every declared route is visited by some sweep.
- **Resize, not reload.** `sweepLayout` resizes the viewport in place after `prepare` has run so the prepared UI state (open drawers, form errors, etc.) is preserved across sizes.
- **`prepare` timing.** The `prepare` callback is enqueued *after* the content wait and *before* axe, so it sets up interactive states that only exist post-action.
- **Capture mode is opt-in.** The `E2E_DESIGN_CAPTURE` env var (exposed as `designCaptureLocales` in the Cypress config) switches the entire spec to photographing; with it unset, behavior is identical to a normal audit run.
- **Theme assertion in capture mode.** `captureShot` asserts the Vuetify theme class is present before calling `cy.captureDesign`, because the default theme depends on the visitor's stored preference or OS setting.
