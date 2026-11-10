---
source: scripts/lighthouse/run.ts
sha256: ba92bda1ac7e71325136db4441d61d34ea54c4c00eb0a9f5a746f3dc93655f95
signature: a44165925832c8db2fc59911d59a702d8ac3ecf4b9e4884d42c5b3c0c2ec1f8f
generated_at: 2026-11-10T02:43:55.183356+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/run.ts

## Purpose

Entry-point script for the Lighthouse audit pipeline (`npm run test:lighthouse`). It discovers all test cases, launches a headless Chrome, collects repeated measurements per case, evaluates the results against a stored baseline, and writes JSON/HTML/Markdown reports. Configuration is driven entirely by environment variables rather than CLI flags.

## Key elements

- **`discoverCases()`** — Glob-style scan of `src/modules/*/tests/lighthouse.ts`; dynamically imports each file for its `lighthouseCases` export and appends the site-level `siteCases`.
- **`readScenario()`** — Fetches `/__test/scenario` from the demo backend (`localhost:3100`) to confirm the seeded state; exits 2 if unreachable.
- **`writeReports(name, measured)`** — Persists each run's LHR JSON and the median-run HTML under `reports/lighthouse/<name>/`.
- **`collectAll(cases, scenario, browser)`** — Iterates cases **sequentially**, calling `collectCase` for each, writing reports inline, and returning aggregated `CaseRuns[]` + all `MeasuredRun[]`.
- **`readdirSyncSafe(dir)`** — Wraps `readdirSync` to return `[]` instead of throwing for a missing directory.
- **Top-level promise chain** — Orchestrates the full flow: `discoverCases` ∥ `readScenario` ∥ `startAnalyticsSink` → `launchAuditBrowser` → `collectAll` → `readBaseline` + `evaluate` → write proposed baseline, `summary.md`, `summary.json` → set `process.exitCode`.
- **Constants / env knobs:** `REPORT_DIR`, `API_URL`, `runs` (`LIGHTHOUSE_RUNS`, default 3), `mode` (`LIGHTHOUSE_MODE`, default `"compare"`).

## Relationships

| Neighbor | Interaction |
|---|---|
| `scripts/lighthouse/analytics-sink.ts` | Calls `startAnalyticsSink()` before collection; closes the sink in a `.finally()` after the browser. |
| `scripts/lighthouse/baseline.ts` | Reads the current baseline via `readBaseline()`; writes a proposed baseline to `PROPOSED_BASELINE_PATH`; logs `LIGHTHOUSE_BASELINE_PATH` in output. |
| `scripts/lighthouse/chrome.ts` | Calls `launchAuditBrowser()` to obtain the `AuditBrowser`; closes it in `.finally()`. |
| `scripts/lighthouse/collect.ts` | Calls `collectCase(audit, scenario, browser, runs)` per case; consumes the returned `MeasuredRun[]`. |
| `scripts/lighthouse/evaluate.ts` | Calls `evaluate({ runs, baseline, siteExceptions, mode })`; uses `closestToMedian` to pick the representative HTML report. |
| `scripts/lighthouse/summary.ts` | Calls `renderSummary(evaluation, baseline)` to produce the human-readable Markdown summary. |
| `tests/lighthouse/site.ts` | Imports `siteCases` (appended to module-discovered cases) and `SITE_EXCEPTIONS` (passed to `evaluate`). |
| `tests/support/lighthouse/case.ts` | Imports the `LighthouseCase` type used throughout. |
| `tests/support/scenario-description.ts` | Imports the `ScenarioDescription` type returned by `readScenario()`. |

## Notes

- **Env-over-flags:** `LIGHTHOUSE_RUNS` and `LIGHTHOUSE_MODE` are read from `process.env` because the npm script forwards its arguments to `start-server-and-test`, which cannot relay them as CLI flags.
- **Exit-code contract:** `0` = pass, `1` = at least one hard failure, `2` = infrastructure error (backend down, no reports, sink port occupied).
- **Sequential collection:** Cases are audited one at a time (not parallel) to keep resource usage predictable on a single browser instance.
- **Proposed baseline always written:** Even in `compare` mode, a new proposed baseline (with metadata + medians) is written to `PROPOSED_BASELINE_PATH` on every run.
- **`readdirSyncSafe` ordering:** Defined *after* `discoverCases` in source, but safe because `discoverCases` is only invoked later in the promise chain, after the binding is initialized.
- **`process.loadEnvFile()`** (Node ≥ 20.12) is wrapped in `try/catch` so the script also works in CI where no `.env` file exists.
