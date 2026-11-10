---
source: scripts/e2e/layout-findings.ts
sha256: d558e1158aeb91a4be23e94ed2f48b516a9ce8ea5a3c450bc04f8a5ad5d15f3e
signature: 3a1162057b7fe928ad68cb5b4066265ecdd473c44be3e776fec154f9c4666019
generated_at: 2026-11-10T02:32:57.108620+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/layout-findings.ts

## Purpose

Pure-data "judgment" layer for the layout sweep: defines the finding/allowance types, decides which findings block a run, stamps allowances onto findings, and formats the failure message. Split from the DOM-collecting code (`layout-checks.ts`) so the rules are unit-testable with no browser.

## Key elements

- **`LayoutCheckId`** — union of the six check identifiers (`overflow`, `overlay-fit`, `clipped`, `covered`, `input-font`, `scroll-x`).
- **`LayoutMode`** — `'normal' | 'text-spacing' | 'text-200'`; the text treatment active when a finding was produced.
- **`LayoutFinding`** — plain-data record of one layout problem (check, severity, selector, rect, detail, optional `allowed` reason). No DOM node is retained.
- **`LayoutAllowance`** — a per-element, per-check opt-out with a required reason and optional viewport scope.
- **`LayoutCaseOptions`** — case-level knobs: `only` (restrict viewport set) and `allow` (list of allowances).
- **`assertReason` / `assertCaseOptions`** — validate that every opt-out carries a substantive reason (≥ 20 chars, not a placeholder); called at spec-collection time so a bad reason fails immediately.
- **`applyAllowances`** — marks matching findings with the allowance's reason; accepted findings stay in the list for the report (D2.8).
- **`blockingFindings`** — filters to `severity === 'blocking'` findings that have no `allowed` reason.
- **`gateMessage`** — renders the multi-line failure string shown in CI output.
- **`sizesFor`** — returns the ordered viewport list a case should run (all, or the `only` subset).
- **`TEXT_SPACING_CSS` / `TEXT_200_CSS`** — the CSS snippets injected for the two non-normal text modes.
- **`TEXT_MODE_AT`** — maps `desktop → 'text-200'`, `phone → 'text-spacing'`; the sweep's single source of truth for which text mode applies at which size.
- **`BLOCKING_TEXT_MODES`** — `['normal', 'text-spacing']`; only these modes produce blocking findings (Q2.4).

## Relationships

- **`scripts/e2e/viewports.ts`** — imports the `ViewportName` type; every function that deals with sizes is parameterised by it.
- **`tests/support/e2e/layout-checks.ts`** — produces `LayoutFinding` objects from a live page; this file consumes and judges them.
- **`tests/support/e2e/layout-task.ts`** — orchestrates the per-viewport walk; calls `sizesFor`, `applyAllowances`, `blockingFindings`, and `gateMessage`.
- **`tests/e2e/specs/layout-checks.cy.ts`** — the Cypress spec that invokes the layout task and asserts on `gateMessage` output.
- **`tests/support/e2e/a11y-sweep.ts`** — sibling sweep; `gateMessage` is intentionally shaped to mirror the axe gate's format for consistent CI output.
- **`tests/unit/scripts/e2e/layout-findings.spec.ts`** — unit tests exercising every exported function without a DOM.

## Notes

- `selectorMatches` (module-private) uses prefix + delimiter matching (space, dot, or `[`) rather than full string equality, so an allowance on `#nav` also covers `#nav .item`.
- `applyAllowances` does **not** remove accepted findings — they remain in the array (tagged with `allowed`) so the report still lists them.
- `assertCaseOptions` is expected to run at spec-collection time (not at assertion time), giving a fast, clear error for malformed opt-outs.
- `TEXT_MODE_AT` is a `Partial` record; any viewport absent from it runs only in `'normal'` mode.
- `PLACEHOLDER_REASON` is a case-insensitive regex anchored to the start, so a legitimate reason that merely *contains* "todo" later in the string passes.
