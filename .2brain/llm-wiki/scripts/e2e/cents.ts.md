---
source: scripts/e2e/cents.ts
sha256: 159c413918b7473cf6494aacd9c8c555f3f82a3f474d4eb3522992fbc8cdc042
signature: 49f748fc7d07dd64fea23c1825fad3a487ffb3a8e42e9241340243eb1450febc
generated_at: 2026-11-10T02:31:04.338859+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/cents.ts

## Purpose

Pure helper module that converts a locale-formatted money string (e.g. `€1,234.50` or `1.234,50 €`) into an integer count of cents, and sums multiple such strings. It lives outside `tests/support/e2e/` deliberately so the unit test suite can import and test it without a browser.

## Key elements

- **`cents(text: string): number`** — Strips every non-digit character from `text` and returns the result as an integer. Throws if the string contains no digits at all. Assumes the shop's currencies all use two decimal places, so the trailing two digits represent cents.
- **`sumCents(texts: readonly string[]): number`** — Applies `cents` to each element in the array and returns the running total.

## Relationships

- **`tests/unit/scripts/e2e/cents.spec.ts`** — Unit tests that exercise `cents` and `sumCents` in isolation (no browser needed, which is why this file is not under `tests/support/e2e/`).
- **`tests/support/e2e/steps.ts`** — E2E step helpers that import these functions to compare on-screen price text in journey specs.
- **Journey spec files** (`cu1`, `cu5`, `cu10`, `cu16`, `cu17`, `cu22`, `n1`, `vi1`, `vi5`, etc.) — Import (directly or via `steps.ts`) to assert that displayed prices match expected cent totals regardless of locale formatting.

## Notes

- The file is intentionally co-located with `mail-message.ts` (same split) — both are pure utilities kept outside the browser-bound `tests/support/e2e/` directory so they are unit-testable.
- The implementation assumes **exactly two decimal places** for every currency the shop uses. A currency with zero or three decimals would produce a wrong result; this is an accepted constraint of the shop's catalog.
- `cents` throws (rather than returning a sentinel) when the input has no digits, so callers in specs will fail loudly with a message that includes the offending text.
