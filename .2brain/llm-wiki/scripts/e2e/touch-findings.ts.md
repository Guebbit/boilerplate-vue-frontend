---
source: scripts/e2e/touch-findings.ts
sha256: 150144d4483b370a0d7624d1271388c9ff343f429c4fd6d5dc1e8fceeab60830
signature: bc4d0be6162f6deaae94b1f62641641f220511a8dcf67a05a7b55c0b5e29cc90
generated_at: 2026-11-10T02:37:53.523016+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/touch-findings.ts

## Purpose

Pure classifier that turns `TouchProbe` records (plain data about page elements) into `TouchFinding` results describing what a finger cannot reach. It encodes four "touch-reachability" rules and groups repeated hits so a report doesn't repeat one issue a hundred times. Splitting classification from collection (in `tests/support/e2e/touch.ts`) keeps the rules unit-testable with no DOM.

## Key elements

- **`TouchProbe`** (interface) — the data shape the collector reads off one element: selector, control/interactive flags, opacity, visibility, Vuetify-specific inputs, title, text, clipping, accessible name, tooltip reference.
- **`TouchFindingKind`** (type) — the four rule categories: `hidden-control`, `title-only-data`, `title-only-hint`, `tooltip-on-non-control`.
- **`TouchFinding`** (interface) — one grouped rule hit: kind, detail string, element count, up to 3 selectors.
- **`GATED_KINDS`** (const) — the three kinds that fail a test. `title-only-hint` is excluded (recorded for triage, not gated).
- **`classifyTouchProbes(probes)`** (exported) — main entry point; applies all rules to every probe and returns grouped findings in first-seen order.
- **`gatedFindings(findings)`** (exported) — filters findings down to the gated kinds.
- **`hitsOf(probe)`** (internal) — evaluates all four rules against a single probe, returns the list of hits.
- **`titleKind(probe)`** (internal) — classifies a probe's `title` attribute as `title-only-data`, `title-only-hint`, or "no finding."
- **`isAllowlisted(probe)`** (internal) — Vuetify patterns (selection-control input, file input, field input) that are intentionally invisible but tappable.
- **`addHit`** (internal) — folds a hit into a `Map` keyed by `kind\u0000detail`, incrementing count and capping stored selectors at 3.

## Relationships

- **`tests/support/e2e/touch.ts`** — produces the `TouchProbe` records via `collectTouchProbes`; this file is the consumer that turns those records into findings.
- **`tests/e2e/specs/touch.cy.ts`** — the Cypress spec that drives the page and feeds probes through this classifier.
- **`tests/support/e2e/touch-task.ts`** — Cypress task wrapper that calls into the collector/classifier pipeline.
- **`tests/unit/scripts/e2e/touch-findings.spec.ts`** — unit tests that exercise `classifyTouchProbes` and `gatedFindings` with hand-built probes (no DOM).

## Notes

- `title-only-hint` is intentionally **not** gated; it surfaces in reports for human triage without failing CI.
- The opacity threshold is **0.1**, not 0 — anything below 10% effective opacity is treated as invisible to a finger.
- `title-only-data` detection has two paths: CSS clipping (`probe.clipped`) **or** a JS-side ellipsis cut (text is a truncated prefix of the title ending in `...` or `…`). The `TRAILING_ELLIPSIS` regex handles both the three-dot and single-codepoint forms.
- Grouping key uses `\u0000` (NUL) as the separator between kind and detail to avoid collisions with any user-visible text.
- A control whose `accessibleName` already contains the title text is excluded from `title-only-hint` (e.g., an icon button whose aria-label equals its title).
