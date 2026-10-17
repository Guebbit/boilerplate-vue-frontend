---
source: tests/support/e2e/visual-sweep.ts
sha256: 1c604f4405d3689e2f32fdb427e018aba8732626d6e920775adec82251f49f55
generated_at: 2026-10-17T02:27:42.246868+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/visual-sweep.ts

## Purpose

Shared Cypress helper that runs one visual-regression sweep over a list of screens at a given authentication level. It exists so every module's visual spec can declare its screens in a uniform shape without duplicating the visit → settle → freeze → snapshot pipeline, while keeping baselines colocated with each module rather than in a central folder.

## Key elements

- **`VisualSweepCase`** (interface) — one screen to snapshot. Fields: `name` (baseline filename), `route` (locale-prefixed path), `readySelector` (element to wait for), optional `prepare` (Cypress commands to drive the page into the target state), optional `redact` (selectors whose text is replaced with a fixed placeholder before the snapshot).
- **`VisualSweepEntry`** (type alias) — a readonly `[name, route, readySelector]` tuple *or* a full `VisualSweepCase`; the shorthand for the common first-paint case.
- **`toCase`** (internal) — normalizes either spelling to the object form using the `'name' in entry` discriminant (avoids `Array.isArray`, which won't narrow a readonly tuple).
- **`REDACTED`** (internal constant) — the literal string (`'redacted'`) substituted into redacted elements before the snapshot.
- **`sweepVisual`** (exported function) — the main entry point. Accepts a `label`, a `screens` array of `VisualSweepEntry`, and an optional `role` (`'user' | 'admin'`). Emits a `describe` block with a `beforeEach` that visits `/en`, restores, and optionally logs in, then an `it` per screen that: tracks network → visits route → waits for `readySelector`, `h1`, and the main container → settles the network → runs `prepare` → redacts → freezes time/animations → calls `cy.compareSnapshot`.

## Relationships

- Consumed by every module-level visual spec (`account.visual.cy.ts`, `cart.visual.cy.ts`, `feedback.visual.cy.ts`, `inventory.visual.cy.ts`, `locales.visual.cy.ts`, `admin.visual.cy.ts`, `realtime.visual.cy.ts`, `orders.visual.cy.ts`, `products.visual.cy.ts`, `users.visual.cy.ts`, `wishlist.visual.cy.ts`) and the top-level `tests/e2e/visual/visual.cy.ts`. Each imports `sweepVisual` (and optionally `VisualSweepCase`) and calls it with its own screen list.
- Relies on Cypress custom commands defined elsewhere in `tests/support/`: `cy.compareSnapshot`, `cy.freezeForVisual`, `cy.trackNetwork`, `cy.settleNetwork`, `cy.loginAs`, `cy.restore`.
- `src/modules/account/tests/e2e/account.visual.cy.ts` is listed in the dependency graph; the relationship is the same import-as-consumer pattern as the other visual specs.

## Notes

- **Blame the omission, not the inclusion:** `beforeEach` does a single `cy.visit('/en')` as warm-up. A second immediate re-visit of the same route was observed to render only the navigation shell (~77 colours vs. ~3100). The guard against this is the explicit `main`/`[role=main]`/`#app` visibility assertion *after* the `h1` check — removing it lets a blank page pass.
- **Redact replaces, doesn't hide:** text is overwritten with the literal `'redacted'` via `.invoke('text', …)` so the element still occupies layout space. A `display: none` or `visibility: hidden` approach would still let the original text influence column width.
- **`toCase` discriminant:** uses `'name' in entry` rather than `Array.isArray` because TypeScript will not narrow a readonly tuple with `Array.isArray`.
- **Not a gate:** the visual suite (`test:e2e:visual`) is intentionally excluded from `npm run complete`. Fonts and antialiasing shift pixels across machines, so the suite is a report, not a CI blocker.
- **No domain coupling:** the file lives under `tests/support/` and must stay domain-agnostic. Adding a hard-coded screen list here would re-couple the helper to a specific module.
