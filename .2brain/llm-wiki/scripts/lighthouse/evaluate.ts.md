---
source: scripts/lighthouse/evaluate.ts
sha256: 7b3d882c9c0720ea59b40397d14401551390733d00d97e62e34ef6e222196c35
signature: eccf90999b7fd495857a91cab3ad7c4a35c3665fac67cd0850495105465ed233
generated_at: 2026-11-10T02:43:23.057903+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/evaluate.ts

## Purpose

Pure (no I/O) evaluation layer that turns the Lighthouse reports collected for every test case into a structured `Evaluation` of hard **failures**, soft **warnings**, and per-metric **medians**. It encodes the gating policy from decision D3: structural issues (page loads, stays out of login, no external requests) and named performance audits gate the run; timing regressions and report-only audits only warn.

## Key elements

- **`evaluate(input)`** – the sole entry point. Accepts all case runs, the committed baseline, site-wide exceptions, and a `Mode` (`compare` | `measure`). Returns an `Evaluation` with `failures`, `warnings`, and `medians`.
- **`mediansOf(runs)`** – computes the median LCP, FCP, TBT, SI, CLS, and performance-category score across a case's runs.
- **`passed(report, id)`** – true when an audit is absent, its display mode is in `NEVER_FAILS` (`notApplicable`, `manual`, `informative`), or its score ≥ `PASS_SCORE` (0.9).
- **`foreignRequests(report)`** – returns URLs from `network-requests` that point to a host outside `LOOPBACK_HOSTS`.
- **`structuralFailures(caseRuns)`** – per-run checks: runtime error, HTTP status, ended-on-login-page, foreign requests.
- **`auditFailures(caseRuns, exceptions, failedSomewhere)`** – evaluates hard audits (weighted best-practices, optional SEO, named `HARD_PERFORMANCE_AUDITS`). An audit fails the case only if it fails in **strictly more than half** the runs (`failsMostly`). Also flags **stale exceptions** (declared but passing everywhere).
- **`timingWarnings(id, now, baseline)`** – warns when a metric exceeds `TIMING_HEADROOM` × baseline or performance drops below baseline ÷ `TIMING_HEADROOM`.
- **`shiftWarning(id, now)`** – warns when median CLS > `CLS_LIMIT` (0.1).
- **`benchmarkWarning(runs, environment)`** – warns when the machine's `benchmarkIndex` drifts > `BENCHMARK_TOLERANCE` (25 %) from the baseline environment, making timings incomparable.
- **`insightWarnings(caseRuns)`** – lists `REPORT_ONLY_AUDITS` that failed in most runs.
- **Constants** – `CLS_LIMIT`, `TIMING_HEADROOM`, `BENCHMARK_TOLERANCE`, `HARD_PERFORMANCE_AUDITS`, `REPORT_ONLY_AUDITS`, `PASS_SCORE`.
- **`median(values)`** – exported utility; median (mean of two middle values for even-length arrays).

## Relationships

- **`scripts/lighthouse/baseline.ts`** – provides the types `BaselineEnvironment`, `CaseMetrics`, and `LighthouseBaseline` consumed throughout.
- **`scripts/lighthouse/chrome.ts`** – provides `LOOPBACK_HOSTS`, the set of hosts treated as "this machine" for the foreign-request check.
- **`scripts/lighthouse/run.ts` / `collect.ts` / `summary.ts`** – same-directory pipeline: `collect` gathers raw LHRs, `run` orchestrates, and `summary` likely formats the `Evaluation` this module produces.
- **`tests/support/lighthouse/case`** (outside the neighbor list but a direct import) – supplies the `CaseRules` shape (case name, SEO flag, per-case exceptions).

## Notes

- **Pure by contract.** The module docblock states "no I/O"; all data arrives pre-collected. This makes it trivially unit-testable.
- **`Mode` distinction.** In `measure` mode every finding that would be a failure is demoted to a warning (per the type-level doc). The `compare` path is the one that can make the process exit 1.
- **Stale-exception detection is a *failure*, not a warning.** If a site-wide or per-case exception references an audit that passed in every run, `evaluate` pushes a hard failure (`stale exception`). The same applies at the site level after the loop.
- **Audit weights are read from the report itself** (`report.categories[cat].auditRefs`), not from a hard-coded list, so adding a new audit to a category in Lighthouse doesn't require a code change here.
- **`PASS_SCORE` is 0.9, not 1.0.** A score of exactly 0.9 passes; 0.89 does not.
- **CLS is deliberately non-gating.** The docblock on `shiftWarning` explains it correlates with load timing (late font swap, post-paint data) and would flap as a gate; it is revisited once a CI-pinned baseline shows stability.
- **`failsMostly` uses strict majority** (`failed * 2 > runs.length`), so with 2 runs an audit must fail both; with 3 runs it must fail at least 2.
