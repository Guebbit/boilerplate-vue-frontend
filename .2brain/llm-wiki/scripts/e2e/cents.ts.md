---
source: scripts/e2e/cents.ts
sha256: 159c413918b7473cf6494aacd9c8c555f3f82a3f474d4eb3522992fbc8cdc042
generated_at: 2026-10-02T14:33:46.307235+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/cents.ts

## Purpose

A pure, browser-free utility that parses a locale-formatted money string into an integer count of cents, so e2e assertions can compare *amounts* without caring how the locale spells them (e.g. `€1,234.50` vs `1.234,50 €`). It lives in `scripts/e2e/` rather than `tests/support/e2e/` so the unit suite can import it without a running browser, mirroring the split used by `mail-message.ts`.

## Key elements

- **`cents(text: string): number`** — Strips every non-digit character from a money string and returns the remaining digits as a `Number`. Throws an `Error` (naming the offending text) if the string contains no digits at all.
- **`sumCents(texts: readonly string[]): number`** — Sums the cent values of several money texts by calling `cents` on each. Propagates the same no-digit error if any entry is empty.

## Relationships

- **Journey specs** (`cu1-first-purchase`, `cu5-price-moves-while-in-cart`, `cu10`, `cu11`, `cu16`, `cu17`, `cu22`, `n1-withdraw-before-dispatch`, `vi1-browse-the-catalogue`): import `cents` / `sumCents` to assert that a displayed price equals an expected cent amount, sidestepping locale formatting differences.
- **`tests/support/e2e/steps.ts`**: shared step helpers that likely re-export or call these functions so journey specs can reference them through a single import surface.
- **`tests/unit/scripts/e2e/cents.spec.ts`**: the unit test file that pins the parsing behaviour (including the throw-on-empty case) without needing a browser context.

## Notes

- The "strip all non-digits" strategy assumes every currency the shop uses has exactly two decimal places; a three-decimal currency (e.g. JPY) would be mis-parsed.
- Because the function returns `Number`, very large amounts (> 2³²) could lose precision; in practice shop prices are far below that limit.
- The deliberate placement outside `tests/support/e2e/` is a convention: if you need a pure helper unit-testable without Cypress, put it under `scripts/e2e/` rather than in the support directory.
