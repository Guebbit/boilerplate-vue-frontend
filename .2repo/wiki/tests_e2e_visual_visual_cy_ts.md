# tests/e2e/visual/visual.cy.ts

## Purpose

Visual regression tests for the application "shell" — the pages that don't belong to any domain module (landing page, static prose pages, error page). Because module-owned screens keep their baselines alongside their module, these ownerless screens are the ones captured here. The suite is a reporting tool, not a CI gate.

## Key elements

- **`sweepVisual('the shell', […])`** — Captures four screens: `home` (`/en`, `#home-page`), `about` (`/en/about`, `#static-page-about`), `faq` (`/en/faq`, `#static-page-faq`), `not-found` (`/en/this-route-does-not-exist`, `#error-page`). Each entry is a `[label, url, selector]` tuple.
- **`sweepVisual('the shell, signed in', […], 'user')`** — Captures the signed-in home page with the cart/account header visible. The third argument (`'user'`) tells the harness to run under an authenticated session.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function. That file defines how the sweep works, why a pixel diff is treated as a report rather than a pass/fail gate, and what the "five things that must be frozen" are (detailed further in `docs/tools/visual-regression.md`).

## Notes

- **Deliberately excluded from `npm run complete`.** This suite runs separately; a failing diff produces a report, not a build failure.
- **No baselines live in this file's directory.** The sweep utility (in `visual-sweep.ts`) manages where screenshots are stored and compared; the `.cy.ts` file only declares *what* to capture.
- **Adding a new shell page** means appending a `[label, url, selector]` tuple to the existing `sweepVisual` call — no new function or import needed.
