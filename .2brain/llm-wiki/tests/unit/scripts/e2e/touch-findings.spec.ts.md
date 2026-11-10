---
source: tests/unit/scripts/e2e/touch-findings.spec.ts
sha256: d28cb203b9cd78b9a172011c7e4b968b1a0fe8ce82f6ea535eee93c310264032
signature: 76be4937583d600c219baff2662c83112d58df1c0158dd2ed095766c5c6bceaf
generated_at: 2026-11-10T08:18:59.234632+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/touch-findings.spec.ts

## Purpose

Unit tests for the `touch-findings` classifier. Each rule in `scripts/e2e/touch-findings.ts` gets a "red probe" (input that should trigger a finding) and a "green probe" (input that should pass cleanly), covering five finding kinds plus the grouping and gating behavior.

## Key elements

- **`probe(overrides?)`** — local helper that returns a fully-visible, interactive `<button>` `TouchProbe` baseline; every test mutates one field to isolate a single rule.
- **`describe('hidden-control')`** — red: opacity 0 or `visibility: hidden` on an interactive control. Green: opacity ≥ 0.5, non-interactive elements, and special inputs (selection-control, file, field).
- **`describe('title-only-data')`** — red: title carries data the visible text lost (CSS clip or JS ellipsis). Green: title content already present in the visible text.
- **`describe('title-only-hint')`** — red: title adds supplementary info with no truncation. Green: icon button whose `accessibleName` already encodes the title.
- **`describe('tooltip-on-non-control')`** — red: `describedByTooltip` on a non-interactive, non-control element. Green: same flag on a real button.
- **`describe('grouping and the gate')`** — verifies identical findings collapse into one entry (`count`, first 3 `selectors`), and that `gatedFindings` filters out non-failing kinds (e.g. `title-only-hint`) while keeping failing ones (e.g. `hidden-control`).

## Relationships

- **`scripts/e2e/touch-findings.ts`** (imported) — supplies `classifyTouchProbes`, `gatedFindings`, and the `TouchProbe` type. This spec is the sole test neighbor; it exercises both exported functions and every field of `TouchProbe` at least once.

## Notes

- The module-level JSDoc comment (`@module`) describes the *source* file's contract, not this spec — a copy-paste artifact from the generator.
- "Gated" kinds are the subset of findings that make the E2E assertion fail; non-gated kinds (like `title-only-hint`) are recorded but tolerated. The last test in the file is the only place `gatedFindings` is called directly.
- Selector cap: grouping stores at most **three** selectors in the output, even when `count` is higher — asserted explicitly in the 5-cell test.
