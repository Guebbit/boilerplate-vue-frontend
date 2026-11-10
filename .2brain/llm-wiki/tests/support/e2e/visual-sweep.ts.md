---
source: tests/support/e2e/visual-sweep.ts
sha256: 5407d959626214861b2ca4cbf050a6f2778d7c11183d37e24cbdf96141f98ef8
signature: 25da418b2d7e1017051404cea49e106a134fc54c2fd4f0f009ae105d943c7d08
generated_at: 2026-11-10T07:37:40.168024+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/visual-sweep.ts

## Purpose

Domain-agnostic helper that runs a visual-regression sweep over a set of screens at a given auth level. For each screen it iterates over the requested viewports (and optionally dark theme), settles the page, and calls `cy.compareSnapshot`, producing per-viewport baseline PNGs beside the calling spec. It exists so every module's visual spec shares one implementation of viewport, freezing, settling, and snapshotting logic.

## Key elements

- **`VisualSweepCase`** (exported) — full configuration for one screen: `name`, `route`, `readySelector`, plus optional `prepare`, `viewports`, `theme`, `scrollTo`, `redact`.
- **`VisualSweepEntry`** — union of a `[name, route, readySelector]` tuple shorthand or a full `VisualSweepCase`.
- **`sweepVisual(label, screens, role?)`** (exported) — the main entry point. Creates a `describe` block, iterates `screens × viewports`, visits each route, settles network/images/theme, then snapshots.
- **`snapshotName`** — builds the baseline filename `<name>.<viewport>[.dark].png`.
- **`imagesLoaded`** — retries until every in-viewport `<img>` has `complete === true` (skips below-the-fold lazy images; tolerates broken images).
- **`switchDarkAndSettle`** — freezes animations, toggles dark theme via `switchToDarkTheme`, then blurs the focus ring left by the toggle.
- **`scrollUnderBar(selector)`** — `scrollIntoView` an element to just under the fixed `header`, with `duration: 0`.
- **`toCase`** — normalises the tuple shorthand to the object form using `'name' in entry` (avoids `Array.isArray` narrowing issue with readonly tuples).

## Relationships

- **`scripts/e2e/viewports.ts`** — imports the `ViewportName` type used throughout.
- **`./apply-viewport`** — imports `applyViewport`, which sizes the viewport and enables touch for phone/tablet.
- **`./sweep-state`** — imports `resolveRoute`, `switchToDarkTheme`, and the `SweepRoute` type.
- **Consumers** — imported by every module visual spec: `account.visual.cy.ts`, `cart.visual.cy.ts`, `example.visual.cy.ts`, `inventory.visual.cy.ts`, `locales.visual.cy.ts`, `admin.visual.cy.ts`, `realtime.visual.cy.ts`, `orders.visual.cy.ts`, `products.visual.cy.ts`, `tasks.visual.cy.ts`, `users.visual.cy.ts`, `wishlist.visual.cy.ts`, and `tests/e2e/visual/visual.cy.ts`.
- **`src/modules/shop-tasks/tests/notices.spec.ts`** — appears as a graph neighbor (likely shares `sweep-state` or viewport tooling in the same test directory).

## Notes

- **Not in the CI gate.** Deliberately excluded from `npm run complete`; run separately via `test:e2e:visual`. Cross-machine font rendering and antialiasing differences make it a report, not a gate.
- **No warm-up visit.** A second immediate `cy.visit` once produced a blank nav-shell page (~77 colours vs. ~3100) that passed every assertion. The single `cy.visit('/en')` in `beforeEach` is load-bearing.
- **Tag namespacing.** Tags use `@visual-phone`, `@visual-dark`, etc., to prevent the grep plugin's static pre-filter from dropping other specs that use a bare `@phone` tag.
- **`redact` replaces, not hides.** The text is set to the literal string `redacted`; hiding the element would still let it influence column width and shift the layout.
- **Light theme is asserted explicitly.** When `theme` is not `'dark'`, the spec asserts `.v-application.v-theme--light` exists, guarding against an OS-level dark-mode setting silently recording dark pixels.
- **`DEFAULT_VIEWPORTS` is `['desktop']`.** Omitting `viewports` on a case produces exactly one desktop test.
