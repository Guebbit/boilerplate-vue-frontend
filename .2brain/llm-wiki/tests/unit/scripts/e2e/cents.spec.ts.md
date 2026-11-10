---
source: tests/unit/scripts/e2e/cents.spec.ts
sha256: 8e89b44bb05388d32831838b182484442951abacf8059032ffe896446b538032
signature: 8e89b44bb05388d32831838b182484442951abacf8059032ffe896446b538032
generated_at: 2026-11-10T08:15:05.309233+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/cents.spec.ts

## Purpose

Unit tests for the `cents` and `sumCents` helpers in `scripts/e2e/cents.ts`. They verify that monetary strings read off a screen are correctly parsed into integer cent values regardless of locale formatting (decimal comma vs. point, symbol position, surrounding prose), and that the helpers fail loudly rather than silently zeroing out unparseable text.

## Key elements

- **`describe('cents')`** — parameterised table (`it.each`) covering five locale/prose variants (`€85.00`, `85,00 €`, `€1,234.50`, `1.234,50 €`, `Shipping Standard — €5.00`) and asserting the expected integer cent value.
- **Error-case test** — `cents('free')` must throw with a message that quotes the offending text (`no amount in "free"`).
- **`describe('sumCents')`** — three cases: mixed-locale array sums to the correct total, an empty array returns `0`, and an array containing a non-amount string throws (`no amount`) instead of silently contributing zero.

## Relationships

- **`scripts/e2e/cents.ts`** — the sole module under test. The spec imports `cents` and `sumCents` from that file (four levels up to the project root, then back into `scripts/e2e/`).

## Notes

- The spec is a **unit** test despite living under a `tests/unit/scripts/e2e/` path; it exercises pure string-parsing logic, not an actual e2e flow. The `e2e` directory reflects the *domain* of the helper (screen-read amounts), not the test tier.
- `sumCents` is explicitly tested to **reject** non-amount entries rather than skip them — a deliberate contract the spec guards against a future "be lenient" refactor.
- Import path uses `../../../../` (four levels) to reach `scripts/e2e/cents.ts` from the nested test directory.
