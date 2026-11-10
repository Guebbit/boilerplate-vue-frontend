---
source: tests/support/e2e/layout-checks.ts
sha256: b93485a052ba865d937989badcede97d611a75c145c3b07117ae0a9fd8815359
signature: afb403f9a0a04a3203c66487dcd05bec100304c13c2c6bbf7e8d5d2526d8a106
generated_at: 2026-11-10T07:32:48.649265+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/layout-checks.ts

## Purpose

Implements geometry-based responsive-layout checks (overflow, overlay fit, target-size comfort) that run inside the a11y sweep at each viewport size. Because Vuetify sets `overflow-x: hidden`, a sideways scrollbar never appears; instead each element's bounding box is read directly and the offending element is named. The file registers two Cypress custom commands (`cy.checkLayout`, `cy.checkTargetComfort`) and a synchronous `collectLayoutFindings` collector that returns plain data for reporting.

## Key elements

- **`CheckLayoutOptions`** – the options bag for `cy.checkLayout`: viewport name, optional check subset, text mode, per-element allowances, and a `narrow` flag (adds input-font / scroll-x checks below 600 px).
- **`cy.checkLayout(label, options)`** – runs the layout checks, records findings to `reports/a11y/<spec>.layout.json` via the `recordLayoutFindings` task, and fails on blocking findings.
- **`cy.checkTargetComfort(label)`** – runs axe's `target-size` rule at the 44 px comfort tier (WCAG 2.5.8 spacing allowance), failing on its findings.
- **`describeElement(element)`** *(exported)* – builds a human-readable, source-stable selector path: stable `id` (excluding Vuetify-generated `v-\d+`), nearest `data-test`, nearest landmark, then up to three `tag.class:nth-of-type` steps.
- **`boxOf` / `textOf` / `toFinding`** – small helpers that turn a DOM element into the plain-number `LayoutFinding` shape.
- **`candidates(page)`** – filters the full DOM to elements a finding could legitimately name (excludes hidden subtrees, visually-hidden 1 px / clipped elements, non-rendered tags).
- **`findOverflow(page)`** – detects elements whose box exceeds the viewport (right or left), skips `position:fixed` and elements inside a sideways-scroll ancestor, and reports the outermost offenders (max 10 named, remainder counted).
- **`findOverlayFit(page)`** – checks active Vuetify overlays and drawers for off-screen edges in all four directions.
- **Constants** – `TOLERANCE` (1 px), `MAX_NAMED` (10), `TEXT_LENGTH` (40), `CONTROL_SELECTOR`, `WIDGET_ROOT`, `GENERATED_ID`, `NON_TEXT_INPUT`.
- **`LAYOUT_REPORT_TASK`** – the string `'recordLayoutFindings'`, matching the task registered in `cypress.config.ts`.

## Relationships

- **`scripts/e2e/layout-findings.ts`** – source of all pure rules and types imported here (`applyAllowances`, `blockingFindings`, `gateMessage`, `TEXT_200_CSS`, `TEXT_SPACING_CSS`, `LayoutFinding`, `LayoutCheckId`, `LayoutMode`, `LayoutAllowance`). This file holds the DOM-reading half; `layout-findings.ts` holds the rule/gate logic that Vitest can reach without a browser.
- **`scripts/e2e/viewports.ts`** – provides the `ViewportName` type used in `CheckLayoutOptions`.
- **`tests/support/e2e/commands.ts`** – `waitForTransitions` is imported to let Vuetify transitions settle before measuring.
- **`tests/support/e2e/layout-task.ts`** – provides the `LayoutRecordRequest` type that shapes the payload sent to the `recordLayoutFindings` task.
- **`tests/support/stub.ts`** – `asStub` is imported for type-casting stubbed objects when the checks run against mocked data.
- **`tests/support/e2e/a11y-sweep.ts`** – the orchestrator that invokes these commands at each size in the viewport matrix (referenced in the module doc comment).
- **`tests/e2e/specs/layout-checks.cy.ts`** – the spec file that exercises the commands defined here.

## Notes

- Width is read via `document.documentElement.clientWidth`, **never** `window.innerWidth`, so the scrollbar gutter is excluded from the reference.
- Vuetify-generated ids (`input-v-12`) are filtered out of `describeElement` because they differ on every page load and would make reports unmatchable.
- `isVisuallyHidden` checks for the legacy `clip: rect(0,0,0,0)` shorthand (Tailwind `sr-only`) **and** `clip-path: inset(50%…)`, in addition to 1 px boxes.
- The file deliberately keeps no rule logic or thresholds; those live in `scripts/e2e/layout-findings.ts` so they are unit-testable under Vitest. The algorithmic rationale and the false-positive allowance table are documented in `docs/tools/layout-sweep.md`.
- `countable` excludes elements inside inactive Vuetify overlays, drawers, and tooltips via `inHiddenSubtree`, preventing stale or dismissed widgets from polluting findings.
