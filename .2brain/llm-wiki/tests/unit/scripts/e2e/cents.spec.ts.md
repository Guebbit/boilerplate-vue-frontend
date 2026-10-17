---
source: tests/unit/scripts/e2e/cents.spec.ts
sha256: 8e89b44bb05388d32831838b182484442951abacf8059032ffe896446b538032
generated_at: 2026-10-17T02:42:13.184999+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/cents.spec.ts

## Purpose
Vitest unit tests for the `cents` and `sumCents` helpers in `scripts/e2e/cents.ts`. Verifies that currency strings rendered in any locale (US thousands-separator, EU decimal-comma, symbol-prefix vs. suffix, embedded in surrounding text) are parsed to the same integer-cent value, and that unparseable input throws rather than silently returning zero.

## Key elements
- **`describe('cents')`** — Parameterized (`it.each`) assertions covering:
  - Prefix vs. suffix currency symbol (`€85.00` / `85,00 €`)
  - US-style thousands comma (`€1,234.50`)
  - EU-style thousands period (`1.234,50 €`)
  - Amount embedded in free text (`Shipping Standard — €5.00`)
  - Error case: `cents('free')` throws with the offending string in the message
- **`describe('sumCents')`** — Assertions covering:
  - Adding mixed-format amounts (`€71.00` + `9,00 €` → 8000)
  - Empty array returns 0
  - Any non-numeric entry causes a throw rather than being treated as zero

## Relationships
- **`scripts/e2e/cents.ts`** (imported via `../../../../scripts/e2e/cents`): sole source under test. The spec exercises `cents` and `sumCents` directly; no other modules or fixtures are involved.

## Notes
- The spec lives under `tests/unit/scripts/e2e/` but the module under test is at the project root `scripts/e2e/`, hence the four-level relative import.
- Error-message assertions check that the raw input string appears verbatim in the thrown message (e.g. `'no amount in "free"'`), which couples the test to exact wording in the implementation.
- All expected values are plain integer cents (no floats), reinforcing the "compare without locale" contract.
