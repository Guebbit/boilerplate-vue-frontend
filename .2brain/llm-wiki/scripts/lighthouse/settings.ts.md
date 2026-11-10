---
source: scripts/lighthouse/settings.ts
sha256: 36b1272a4aed1c34024262c83a019141cdcb555540b88102134c9004c40bb6ff
signature: ed044cd246fd6756dc31b174f43bd7e1b43dc0d873fabfbde4d22efb3eb9ef9b
generated_at: 2026-11-10T02:44:03.902121+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/settings.ts

## Purpose

Pure-data module that defines the Lighthouse configuration (categories, skipped audits, and CLI flags) for the mobile performance run. It exists so the profile is a single importable artifact that a unit test can pin against Lighthouse's own preset, keeping the runner (`collect.ts`) free of configuration logic.

## Key elements

- **`CATEGORIES`** — `['performance', 'best-practices', 'seo']`. Accessibility is deliberately omitted because the separate axe-core sweep covers more ground.
- **`SKIPPED_AUDITS`** — `['cache-insight']`. The preview server's nginx owns cache headers, so auditing them would measure the infra, not the app.
- **`lighthouseFlags(port: number)`** — Returns the full `Flags` object for one `lighthouse(url, flags, config, page)` call. Sets `formFactor: 'mobile'`, `throttlingMethod: 'simulate'`, `logLevel: 'error'`, `enableErrorReporting: false` (Node API never contacts Sentry), and `screenEmulation` with dimensions pulled from `REPORT_VIEWPORTS['lighthouse-mobile']` and `deviceScaleFactor: 1.75` (Moto G Power ratio used by Lighthouse's image-size-responsive calibration).

## Relationships

- **`scripts/e2e/viewports.ts`** — Supplies `REPORT_VIEWPORTS['lighthouse-mobile']` for the `screenEmulation` width/height. This is the single cross-file data dependency.
- **`scripts/lighthouse/collect.ts`** — The runner that calls `lighthouseFlags(port)` and passes the result into Lighthouse's Node API. This file contains no execution logic; it is pure input to `collect.ts`.
- **`tests/unit/scripts/lighthouse/chrome.spec.ts`** — Unit test that imports the exports and asserts the profile matches Lighthouse's own mobile preset, guarding against silent drift.

## Notes

- The module is intentionally side-effect-free (no top-level calls, no I/O) so tests can import and compare values without launching a browser.
- `deviceScaleFactor` is hardcoded to `1.75` rather than derived; if the emulated device changes, this must be updated in lockstep with `REPORT_VIEWPORTS`.
- `CATEGORIES` and `SKIPPED_AUDITS` are `as const` tuples but are spread (`[...]`) into the flags object so Lighthouse sees a plain `string[]`, matching its `Flags` type.
