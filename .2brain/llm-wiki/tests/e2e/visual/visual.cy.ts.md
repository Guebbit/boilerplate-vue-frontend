---
source: tests/e2e/visual/visual.cy.ts
sha256: 5f68b34b8aaa136ba284d2abb4d09ebbec07d2f41c0eaea60c8317650c060dcb
signature: 5f68b34b8aaa136ba284d2abb4d09ebbec07d2f41c0eaea60c8317650c060dcb
generated_at: 2026-11-10T07:25:37.979622+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/visual/visual.cy.ts

## Purpose

Visual regression snapshots for the "shell" screens — pages that belong to no domain module (landing page, static prose pages, 404 error page). Module-owned screens keep their baselines under `src/modules/<name>/tests/e2e/__snapshots__/`, so this file is the catch-all for what has no owner. It is deliberately excluded from `npm run complete`; the pixel diff is a report, not a gate.

## Key elements

- **`sweepVisual('the shell', …)`** — Sweeps five screens: `home` (desktop/phone/tablet), `home` dark-theme phone, `drawer` (phone only, with scrim-settling `prepare`), `about`, `faq`, and `not-found`.
- **`sweepVisual('the shell, signed in', …)`** — Same home page but under the `'user'` role, capturing the pinned cart + account menu. Runs on desktop and phone.
- **`sweepVisual('the shell, staff drawer', …)`** — The full staff drawer (all admin sections) on phone under the `'admin'` role, again waiting for the scrim to settle before the screenshot.
- **`describe('visual run determinism')`** — A sentinel test that asserts `clientWidth === viewportWidth` on a scrolling page, confirming `--hide-scrollbars` is in effect so phone-width layouts aren't shifted by a scrollbar gutter.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides `sweepVisual`, the helper that drives the actual multi-viewport, multi-theme pixel-diff sweep. Every call in this file delegates to it.

## Notes

- Drawer entries have no desktop viewport because the drawer only renders below the `lg` breakpoint.
- The `prepare` callbacks wait for `.v-navigation-drawer__scrim` to reach `opacity: 0.2` — a screenshot taken before the scrim finishes fading in would lack it.
- The sentinel test is a guard against a broken `ELECTRON_EXTRA_LAUNCH_ARGS=--hide-scrollbars` setting; if it fails, every phone-width baseline is silently wrong.
- Screen specs use two shapes: full objects (when `prepare`/`theme` are needed) and three-element arrays `[name, route, readySelector]` for the simple cases.
