# tests/support/e2e/visual-sweep.ts

## Purpose

A single shared helper (`sweepVisual`) that drives one visual-regression pass over a list of screens at a given auth level. It exists so every module's visual spec can reuse the same "visit → wait for real content → freeze → snapshot" sequence without duplicating setup logic or hard-coding domain-specific routes.

## Key elements

- **`sweepVisual(label, screens, role?)`** — The sole export. Registers a `describe` block titled `"visual regression — {label}"`. For each `[name, route, readySelector]` triple it visits the route, asserts real content is present (`h1` visible, a `main`/`#app` container rendered), waits for all in-flight network requests to settle, freezes clocks/animations, and calls `cy.compareSnapshot(name)`. When `role` is provided it signs in via `cy.loginAs(role)` in `beforeEach`; otherwise the sweep runs signed out.
- **`beforeEach`** — Visits `/en` once (establishes session/locale), calls `cy.resetState()`, and conditionally `cy.loginAs(role)`. Deliberately does **not** do a second warm-up visit (see Notes).
- **Per-test guard chain** — `cy.trackNetwork()` → `cy.visit(route)` → `readySelector` exists → `h1` visible → `main`/`#app` visible → `cy.settleNetwork()` → `cy.freezeForVisual()` → `cy.compareSnapshot(name)`.

## Relationships

- Imported by every module's visual spec (`account`, `admin`, `cart`, `feedback`, `inventory`, `locales`, `orders`, `products`, `realtime`, `users`, `wishlist`) and by `tests/e2e/visual/visual.cy.ts`. Each caller supplies its own `screens` array; this file references no routes, selectors, or domain names itself.
- Relies on custom Cypress commands defined elsewhere in the support layer: `cy.compareSnapshot`, `cy.freezeForVisual`, `cy.trackNetwork`, `cy.settleNetwork`, `cy.resetState`, `cy.loginAs`.
- Baseline PNGs are written to a `__snapshots__` folder **beside each calling spec** (resolved by `cy.compareSnapshot`), not to a central directory.

## Notes

- **No warm-up visit.** Visiting a route and immediately revisiting it rendered only the navigation shell (~77 colours vs. ~3100). The single `cy.visit('/en')` in `beforeEach` exists only to seed locale/session; the per-test `cy.visit(route)` is the first real load. Removing it would produce blank-but-stable baselines that never fail.
- **Not in the CI gate.** `test:e2e:visual` is a standalone script excluded from `npm run complete`. Cross-machine font/antialiasing drift makes pixel-perfect comparison machine-specific; the suite is a report, not a gate.
- **No domain coupling by design.** The file lives under `tests/support/` and is imported by every module; naming any route or selector here would recreate the centralization the module split removed.
- The `readySelector` in each screen tuple is a **minimum** existence check; the `h1` and `main` assertions are the real "content is actually rendered" guards (the blank-shell failure passed both `readySelector` and `h1` but failed on `main`).
