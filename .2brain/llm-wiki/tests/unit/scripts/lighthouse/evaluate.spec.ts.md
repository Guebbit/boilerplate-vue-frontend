---
source: tests/unit/scripts/lighthouse/evaluate.spec.ts
sha256: c00429047d24194244c1201de1fb63881ac6f91bfaa3834306f19fe453600bdc
signature: df450c184639575847bfd08f5b523fea9023b3300d438ed821a2dc3846840c01
generated_at: 2026-11-10T08:21:34.602370+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/lighthouse/evaluate.spec.ts

## Purpose

Unit test suite for `scripts/lighthouse/evaluate.ts`. Verifies the pass/fail/warning logic of Lighthouse audit evaluation: which conditions hard-fail a case, which only produce warnings (timing drift, CLS), how exceptions and site-wide overrides work, and the pure helpers `median` and `closestToMedian`.

## Key elements

- **`PASS` / `FAIL`** — constant `AuditResult` fixtures (binary score 1 / 0) used throughout.
- **`report(overrides?)`** — factory that builds a minimal, all-passing `Report` object. Accepts overrides for individual audits, `lcp`, `cls`, `url`, `requests`, `benchmark`, and `runtimeError`.
- **`caseOf(rules, ...runs)`** — shorthand for constructing a `CaseRuns` object.
- **`run(cases, options?)`** — thin wrapper around `evaluate()` that defaults to `mode: 'compare'`, no baseline, and empty `siteExceptions`.
- **`atCls(cls)`** — evaluates a single case whose three runs all report the given CLS value.
- **Test groups** — `median`, `evaluate · the hard set`, `evaluate · nothing leaves the machine`, `evaluate · exceptions`, `evaluate · timing only warns`, `closestToMedian`.

## Relationships

- **`scripts/lighthouse/evaluate.ts`** — the module under test. Imports `evaluate`, `median`, `closestToMedian`, and the types `AuditResult`, `CaseRuns`, `Report`.
- **`scripts/lighthouse/baseline.ts`** — provides the `LighthouseBaseline` type used in timing/CLS warning tests.

## Notes

- `report()` defaults to an all-passing page; tests introduce failures by spreading a single audit override. This keeps each test minimal.
- A `weight: 0` entry in `best-practices` auditRefs (`'a-weightless-one'`) is explicitly tested to confirm it is **not** counted as a failure.
- "Stale exception" is itself a failure: declaring an exception for an audit that passed in every run/case is flagged.
- In `mode: 'measure'`, every hard failure is demoted to a warning; no failures are ever emitted.
- Network-egress checks read the `network-requests` audit's `details.items` URLs; loopback addresses (`127.0.0.1`, `::1`) and `data:` URLs are allowed.
- The `closestToMedian` test uses `numericValue` on the LCP audit to determine which run is nearest the median.
