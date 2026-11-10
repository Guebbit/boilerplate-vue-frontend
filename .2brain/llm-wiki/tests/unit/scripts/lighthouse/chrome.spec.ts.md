---
source: tests/unit/scripts/lighthouse/chrome.spec.ts
sha256: 1dee7f0049825cceb188edf7e9273220a9640f84bcce2bd1e670dbf6e198df98
signature: 1dee7f0049825cceb188edf7e9273220a9640f84bcce2bd1e670dbf6e198df98
generated_at: 2026-11-10T08:21:23.165073+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/lighthouse/chrome.spec.ts

## Purpose

Vitest unit tests that verify the Chrome launch flags and Lighthouse runner options produced by the Lighthouse helper scripts, ensuring network egress is locked, sandboxing is applied correctly per privilege level, and the phone-emulation profile stays in sync with Lighthouse's own mobile preset.

## Key elements

- **`describe('chromeFlags')`** — exercises `chromeFlags(options)` from `scripts/lighthouse/chrome.ts`:
  - Confirms `--proxy-server=127.0.0.1:9` and the `--host-resolver-rules` MAP/EXCLUDE pair are always present (egress lock), regardless of `root`.
  - Confirms `--no-sandbox` appears **only** when `root: true`.
- **`describe('lighthouseFlags')`** — exercises `lighthouseFlags(port)` from `scripts/lighthouse/settings.ts`:
  - `enableErrorReporting` is always `false`.
  - `onlyCategories` is exactly `['performance', 'best-practices', 'seo']` and `skipAudits` is exactly `['cache-insight']`.
  - `screenEmulation` deep-equals `screenEmulationMetrics.mobile` from Lighthouse's own `core/config/constants.js`, keeping the phone profile pinned to Lighthouse's calibration baseline.

## Relationships

- **`scripts/lighthouse/chrome.ts`** — source of the `chromeFlags` function under test.
- **`scripts/lighthouse/settings.ts`** — source of the `lighthouseFlags` function under test.

## Notes

- The egress lock routes traffic to `127.0.0.1:9` (the IANA "discard" port); nothing listens there, so all external requests silently fail. The `MAP * ~NOTFOUND` rule additionally breaks DNS for any non-local hostname.
- The screen-emulation assertion deliberately imports from `node_modules` rather than a local constant, so the test fails the moment a Lighthouse upgrade changes its mobile preset — a canary to force a deliberate review.
- `it.each` is used for the root/non-root matrix to keep the egress-lock assertion DRY across both privilege levels.
