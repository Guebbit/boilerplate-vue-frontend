---
source: tests/unit/scripts/e2e/layout-findings.spec.ts
sha256: 964f0b1d053dd82cafadeeba62a98fe0cc0ce7d92d61a96644988435375a748c
signature: df98fb836aa5ca12cffeef26cf85902e8ee018d67f019e6ee238e6bf50eccad4
generated_at: 2026-11-10T08:16:29.440227+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/layout-findings.spec.ts

## Purpose

Unit test suite for the layout-finding rule engine in `scripts/e2e/layout-findings.ts`. It verifies the contract around a finding: how reasons are validated, how case-level options (viewport narrowing, per-finding allowances) are enforced, how findings are filtered to the blocking set, and what the failure message and size matrix look like.

## Key elements

- **`finding(overrides?)`** – local factory that returns a pre-populated `LayoutFinding` (overflow / blocking / `main div.card`) so each `it` can override a single field.
- **`assertReason` tests** – confirm that a reason must be a real sentence (rejects empty, single-char, "too short", TODO-style strings) and that the thrown message links to `layout-sweep.md#opting-out`.
- **`assertCaseOptions` tests** – verify that `only.reason` and every `allow[].reason` are validated, that the case name appears in the error, and that `undefined` options pass silently.
- **`applyAllowances` tests** – cover matching by (check + selector), ancestor-selector acceptance, sibling-prefix rejection, cross-check rejection, viewport scoping (`viewports` on the allowance), and that accepted findings remain in the returned array.
- **`blockingFindings` tests** – confirm the filter keeps only blocking + unaccepted findings, dropping advisory and already-accepted ones.
- **`gateMessage` tests** – assert the `[layout <case> @ <size>] N blocking finding(s):` header and the one-line-per-finding format (`check — selector — detail`).
- **`sizesFor` tests** – verify the full matrix is returned when no `only` is set, and that named viewports are returned in matrix order (not input order).

## Relationships

- **`scripts/e2e/layout-findings.ts`** – the module under test. This spec imports every public function (`applyAllowances`, `assertCaseOptions`, `assertReason`, `blockingFindings`, `gateMessage`, `sizesFor`) and the `LayoutFinding` type from it.
- **`scripts/audit/css-invasive/report.ts`** – listed as a graph neighbor but has no direct import or interaction in this file.

## Notes

- The `finding()` helper is file-local; it is **not** exported and does not exist in the module under test.
- `applyAllowances` matching is deliberately strict on the selector: it accepts descendants of the named element but not elements that merely share a string prefix (e.g. `div.card-wide` ≠ `div.card`). This is an intentional boundary tested explicitly.
- `sizesFor` preserves the *matrix* order regardless of the order the case lists its viewports—tests rely on `['desktop', 'tablet', 'phone']` as the canonical order.
- The test for `assertReason` uses `it.each` with a `%.repeat(25)` pattern for the valid-reason case in `sizesFor`, suggesting a minimum-length threshold around that value.
