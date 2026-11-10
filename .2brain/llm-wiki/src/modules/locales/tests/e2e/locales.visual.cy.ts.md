---
source: src/modules/locales/tests/e2e/locales.visual.cy.ts
sha256: 9159803acb2e6ac2561f23c62769f499fa38db19e5f3b01570efaa302a0d4806
signature: 9159803acb2e6ac2561f23c62769f499fa38db19e5f3b01570efaa302a0d4806
generated_at: 2026-11-10T04:42:57.416654+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/e2e/locales.visual.cy.ts

## Purpose

Declares the locales module's visual-regression screens (routes, ready selectors, and optional per-screen hooks) to the shared `sweepVisual` runner. Each screen is visited and a screenshot is diffed against a stored baseline. It is **not** part of `npm run complete`; it runs under `npm run test:e2e:visual`.

## Key elements

- **`sweepVisual('locales', [ …screens ], 'admin')`** — single top-level call that registers four screens under the `admin` role and delegates all navigation/wait/diff logic to the helper.
- **Screen definitions (array items):**
  - `locales-list` (`/en/locales`) — ready on `[data-test=list-row]`.
  - `locales-dictionary` (`/en/locales/dictionary`) — ready on `[data-test=dictionary-missing-count]`; waits until the *last* language's baselines have landed so header counts are final.
  - `locale-entries` (`/en/locales/it`) — ready on `[data-test=list-row]`; `redact` masks the "Updated" column (`tbody td:nth-child(4)`) because it equals the run's boot time.
  - `entity-translations` — uses a placeholder route/selector to satisfy the sweep's initial wait, then a **`prepare`** callback re-navigates to a real product (`/en/locales/translations/product/{id}`) obtained via `cy.subjectId('product.inStock')`, waits for `[data-test=translation-tabs]` and a visible `<h1>`, and calls `cy.settleNetwork()` before the snapshot is taken.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` function that this file imports and calls. The helper owns the actual screen-visiting, ready-wait, screenshot, and baseline-diff pipeline; this file only supplies declarative configuration.

## Notes

- Ready selectors deliberately target **data rows** (or late-arriving UI), never the page shell, so baselines capture loaded content rather than a stable-but-meaningless loading state.
- The `entity-translations` entry uses a two-phase pattern: the top-level `route`/`readySelector` exist solely to pass the sweep's built-in wait; `prepare` then performs the real navigation and its own settle. Without this, the generic translation route (which requires a dynamic product id) could not be expressed in the flat `route` string.
- Re-recording baselines (`npm run test:e2e:visual:update`) should only be done **after visually inspecting** the diff image, per the module docblock.
