---
source: scripts/e2e/browser-launch.ts
sha256: a4039c87e0724e0956295299d394ad7c21b481c88b997cc36fae720bdcf56c47
signature: 03c087ae71b50b23ca5436ad7da090a4524a729f6766fecd8c4929750e7ab131
generated_at: 2026-11-10T02:30:56.451427+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/browser-launch.ts

## Purpose

A collection of pure functions that transform Cypress `BrowserLaunchOptions` to fix two headless-browser quirks: the default window size clips viewport screenshots, and headless Chromium reports no pointing device (breaking Vuetify's touch CSS). `cypress.config.ts` keeps a single `before:browser:launch` handler that composes these functions.

## Key elements

- **`WindowSize`** (interface) — `{ width, height }` in CSS pixels.
- **`LaunchBrowser`** (interface) — the subset of Cypress `Browser` this module reads (`name`, `family`, `isHeadless`).
- **`LaunchOptions`** (interface) — the subset of Cypress `BrowserLaunchOptions` this module writes (`args`, `preferences`).
- **`windowFor(viewports)`** — returns the window size whose width and height are each the independent maximum across a viewport map (not the max of any single entry).
- **`withWindowSize(browser, opts, size)`** — no-op for non-headless runs. For headless Electron, sets `preferences.width/height`; for headless Chromium-family, appends `--window-size=W,H` to `args`. All other browsers pass through unchanged.
- **`withDesktopPointer(browser, opts)`** — no-op for non-Chromium, Electron, or Firefox. For headless Chromium, appends `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4` so the browser reports a fine pointer that can hover.

## Relationships

- **`cypress.config.ts`** — registers a single `before:browser:launch` handler that calls `withWindowSize` and `withDesktopPointer` in sequence. Because Cypress retains only the last handler for this event, all launch tweaks are centralized here.
- **`tests/unit/scripts/e2e/browser-launch.spec.ts`** — unit-tests `windowFor`, `withWindowSize`, and `withDesktopPointer` across browser/headless combinations.

## Notes

- `withWindowSize` is a no-op for `cypress open` (non-headless) so a developer's manually sized window is preserved.
- Electron window sizing uses `preferences` (Cypress-documented Electron recipe), not a CLI flag — don't mix the two mechanisms.
- **Known pointer limitation:** once Blink touch emulation is toggled off mid-spec, the browser falls back to "no pointer" rather than the values set by `--blink-settings`. A desktop test running after a touch test in the same spec will have no pointer.
- The functions are generic over `TOptions extends LaunchOptions`, so callers can pass richer option objects without losing extra fields.
