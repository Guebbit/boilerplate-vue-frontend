---
source: tests/e2e/visual/visual.cy.ts
sha256: ce34056b72dd3b5949e01acb00d6b8fff79a46996969e7c7a1a50cc88aa7e999
generated_at: 2026-10-17T02:23:59.161326+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/visual/visual.cy.ts

## Purpose

Visual-regression baselines for the **shell**: the application-level screens that have no owning module — the landing page, static prose pages (about, FAQ), and the 404 error page. Because every module keeps its own snapshots under `src/modules/<name>/tests/e2e/__snapshots__/`, this file is the catch-all for screens that would otherwise be orphaned.

## Key elements

- **`sweepVisual('the shell', …)`** — captures and diffs four anonymous views: `home`, `about`, `faq`, `not-found`. Each entry is a `[name, url, cssSelector]` tuple targeting the stable root element of the page.
- **`sweepVisual('the shell, signed in', …, 'user')`** — same home route but with an authenticated session, isolating the signed-in header (cart count, total, account menu).
- The only import is `sweepVisual`; all sweep logic (navigation, wait, screenshot, diff) lives in the helper.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` function called here. The file contains the full orchestration (route visit, selector wait, screenshot capture, pixel comparison) and the rationale for treating the result as a *report* rather than a *gate*.

## Notes

- Deliberately **not** part of `npm run complete`; a failing diff here does not block CI. See `docs/tools/visual-regression.md` for the five conditions (font, zoom, color profile, etc.) that must be frozen for the comparison to be meaningful.
- Adding a new shell screen means appending one `[name, path, selector]` row to the appropriate `sweepVisual` call — no new spec file is needed.
- The `not-found` entry intentionally uses a bogus path (`/en/this-route-does-not-exist`) so the 404 page renders; the selector `#error-page` anchors the capture to the error component, not the surrounding chrome.
