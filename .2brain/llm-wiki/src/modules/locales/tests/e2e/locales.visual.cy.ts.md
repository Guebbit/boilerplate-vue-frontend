---
source: src/modules/locales/tests/e2e/locales.visual.cy.ts
sha256: 9159803acb2e6ac2561f23c62769f499fa38db19e5f3b01570efaa302a0d4806
generated_at: 2026-10-17T01:05:18.197618+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/e2e/locales.visual.cy.ts

## Purpose

Declares the locales module's screens (routes, ready selectors, and per-screen hooks) to the shared `sweepVisual` visual-regression runner, which visits each screen and diffs a screenshot against a stored baseline. It is the locales-specific screen registry for the project-wide visual test suite.

## Key elements

- **`sweepVisual('locales', [...], 'admin')`** — registers four screens under the `'locales'` group with the `'admin'` user context:
  - **`locales-list`** (`/en/locales`) — ready on `[data-test=list-row]`; targets a data row rather than the page shell so the baseline captures loaded content, not the loading state.
  - **`locales-dictionary`** (`/en/locales/dictionary`) — ready on `[data-test=dictionary-missing-count]`; waits for the *last* language's baselines so header counts are fully computed.
  - **`locale-entries`** (`/en/locales/it`) — ready on `[data-test=list-row]`; uses `redact` to blank the "Updated" column (`tbody td:nth-child(4)`) because that timestamp equals the current run's boot time.
  - **`entity-translations`** — has no static route (needs a product id). The `route`/`readySelector` pair is a placeholder to satisfy the sweep's initial wait; `prepare` then re-navigates to `/en/locales/translations/product/<id>`, waits for `[data-test=translation-tabs]` and a visible `h1`, and calls `cy.settleNetwork()` before the snapshot is taken.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — sole dependency. Provides the `sweepVisual` function that iterates the declared screen list, navigates each route, waits for the ready selector (or executes `prepare`), applies `redact` CSS selectors, and performs the screenshot-diff against the stored baseline.

## Notes

- **Not in `npm run complete`.** Run explicitly with `npm run test:e2e:visual`; re-record baselines only with `npm run test:e2e:visual:update` *and* after visually inspecting the diff image.
- **Ready-selector convention:** select a data row, not the page shell. The shell renders before the API responds, so a shell-level baseline would capture a loading state that is stable, meaningless, and never catches a real regression.
- **Dynamic-route pattern (`entity-translations`):** the `route` field is deliberately a "wrong" static path used only to satisfy `sweepVisual`'s built-in navigation and wait. The `prepare` callback performs the real navigation and its own settle logic. If the sweep runner's internals change, this two-step trick may break.
