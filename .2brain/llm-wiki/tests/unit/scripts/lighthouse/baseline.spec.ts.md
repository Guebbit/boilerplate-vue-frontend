---
source: tests/unit/scripts/lighthouse/baseline.spec.ts
sha256: 6959cbbd20691a54b8324cd44c2527bbb3319d86ca80d15bddab41647b136a42
signature: 92d2838b3be32bab3786668b846852bf536e7be0e99327f2291a8a002fcf8d60
generated_at: 2026-11-10T08:21:10.459369+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/lighthouse/baseline.spec.ts

## Purpose

Unit tests for the `ratchet` function in `scripts/lighthouse/baseline.ts`, verifying the ratchet invariant: a committed Lighthouse baseline can only improve (or gain new cases) — it never degrades. Ensures the baseline-enforcement logic handles improvements, regressions, new cases, dropped cases, and cold-start correctly.

## Key elements

- **`environment`** — shared `BaselineEnvironment` fixture (Lighthouse 13.5.0, Chrome/150, benchmark index 1000) used across all tests.
- **`metrics(overrides?)`** — factory returning a `CaseMetrics` object with sensible defaults (lcp 1000, fcp 500, tbt 100, si 800, cls 0.05, performance 90) and a spread for per-test overrides.
- **`baselineOf(cases)`** — wraps a case map into a full `LighthouseBaseline` with a fixed `generatedAt` timestamp.
- **`apply(current, measured)`** — convenience wrapper around `ratchet` that derives the declared-case list from `measured`'s keys and passes a fixed "now" timestamp.
- **`describe('ratchet', …)`** — five `it` blocks covering: recording an improvement (returns updated values + `improved` list), rejecting a regression (baseline unchanged, empty `improved`), adding a new case at first measurement (`added` list), dropping an undeclared case (`dropped` list), and cold-start from `undefined`.

## Relationships

- **`scripts/lighthouse/baseline.ts`** — the module under test. Imports `ratchet` and the types `BaselineEnvironment`, `CaseMetrics`, `LighthouseBaseline`. All assertions target the shape and behavior of `ratchet`'s return value.

## Notes

- The "improvement" direction is metric-specific: lower `lcp`/`cls` is better, higher `performance` is better. The ratchet logic in the module handles this; the tests only assert observable outcomes.
- `apply` always passes `Object.keys(measured)` as the declared-cases argument, so the "drops a case" test calls `ratchet` directly to supply a narrower declared list (`['a/b']`) — a deliberate distinction from the helper.
- The `generatedAt` / timestamp values are arbitrary constants; no test asserts on temporal ordering.
