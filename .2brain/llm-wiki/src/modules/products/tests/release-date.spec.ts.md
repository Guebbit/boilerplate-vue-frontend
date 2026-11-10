---
source: src/modules/products/tests/release-date.spec.ts
sha256: c2cd989dac96fdec81df64869f8a1872d35d21f12a35dc031917adfeffe0923f
signature: c2cd989dac96fdec81df64869f8a1872d35d21f12a35dc031917adfeffe0923f
generated_at: 2026-11-10T05:30:17.898559+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/release-date.spec.ts

## Purpose

Vitest suite covering the two pure string-comparison helpers exported by `release-date.ts`. It locks in the invariant that the promise-date field is always a plain `YYYY-MM-DD` string (or its absence) and that no timezone or calendar arithmetic is involved.

## Key elements

- **`describe('isReleaseDateChanged')`** — exercises `isReleaseDateChanged(original, next)` with:
  - Later, earlier, and identical day strings.
  - "Cleared" representations: `''`, `null`, and `undefined` all treated as *no day held*.
  - Setting a day where none was held (always `true`) vs. clearing where none was held (always `false`).
- **`describe('dayChange')`** — exercises `dayChange(current, next)` with:
  - Untouched day → returns `undefined` (omitted from request body).
  - Changed day → returns the new `YYYY-MM-DD` string verbatim.
  - Cleared day (`null` / `undefined` / `''`) → returns `''` (empty string on the wire).

## Relationships

- **`src/modules/products/release-date.ts`** — the sole import target. This spec is the only known consumer of `isReleaseDateChanged` and `dayChange`; it defines the behavioral contract those two exports must satisfy.

## Notes

- The file-header comment is a *contract reminder*: neither function may parse a date into a `Date` object or shift it across host timezones. If a future refactor introduces `Date` usage, these tests alone won't catch it (they only assert string equality), so the comment is the primary guard.
- `null` and `undefined` are both valid "no day" sentinels in both functions; the tests treat them identically. Callers should not rely on one over the other.
- `dayChange` returning `undefined` (not `null`) for the "unchanged" case is deliberate: it lets the caller spread the result into a PATCH body and have the key disappear.
