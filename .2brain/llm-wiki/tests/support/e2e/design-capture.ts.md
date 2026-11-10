---
source: tests/support/e2e/design-capture.ts
sha256: ceaa56790dd7e06dfdb0178d2785700ca6095a76fc4d7394704c3a6551357c72
signature: 6d5cf309ff2ed4d0a29602d672ef778cab37e9381d40fb187bd044f1e6d3250d
generated_at: 2026-11-10T07:28:53.850051+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/design-capture.ts

## Purpose

Defines the `cy.captureDesign()` custom Cypress command (registered on `Cypress.Chainable` in this file), which photographs a rendered page in viewport-sized pieces and records DOM metadata (fixed/sticky elements, form inputs, heading outline) into a capture manifest. It is explicitly evidence-collection, not a test: it produces PNGs and structured facts that a downstream AI reviewer reads, since that reviewer cannot open a browser. A wrongly-sized piece fails the test; the design itself never does.

## Key elements

- **`CaptureRequest`** (interface) — identity of a single shot: matrix id, case name, viewport, theme, locale, role, and state.
- **`Cypress.Chainable.captureDesign(request)`** — the registered custom command; callers invoke it after navigating and asserting the state they want frozen.
- **`Scroller` / `findScroller`** — resolves which element actually scrolls the page: a fullscreen `.v-overlay--active` or temporary navigation drawer scrolls internally; otherwise the document root scrolls; a non-fullscreen overlay means no scroll (single piece).
- **`Measured` / `measure`** — reads the DOM once before shooting: scroller, visible `position:fixed` elements (stamped with `data-design-capture-fixed` for later hiding), sticky-repeats flag, visible form inputs (`InputFact[]`), and `h1`–`h3` headings.
- **`describeElement`** — builds a short, stable selector string (`tag#id[data-test=x].class1.class2`) for reporting fixed elements.
- **`isVisible`** — zero-size, `display:none`, `visibility:hidden`, or `opacity:0` all count as not visible.
- **`ownScroller`** — walks ancestors for `overflow-y: auto|scroll`; used to decide whether a sticky element repeats across pieces.
- **`inputsOf` / `labelOf`** — collects phone-keyboard-relevant attributes (`inputmode`, `autocomplete`, `enterkeyhint`) and the visible label for each control.
- **`waitForVisibleImages`** — retries until every on-screen `<img>` reports `complete` (handles lazy/intersection loading).
- **`hideNonBands`** — injects a `<style>` tag that sets `visibility:hidden !important` on fixed elements that are not bands, so they appear only in the first piece.
- **`FIXED_ATTRIBUTE`** (`data-design-capture-fixed`) — the attribute stamped on fixed elements so they can be re-found and hidden by numeric handle.

## Relationships

- **`scripts/e2e/shot-size.ts`** — imports `shotSizeProblem` to validate that each captured piece matches the expected viewport dimensions; a size mismatch fails the test.
- **`scripts/e2e/viewports.ts`** — imports `VIEWPORTS` and the `ViewportName` type; the command uses the viewport table to determine expected piece dimensions.
- **`scripts/audit/design-manual/scripts/manifest.ts`** — imports the `DesignShot`, `InputFact`, and `PageGeometry` types that shape the metadata written to the capture manifest.
- **`scripts/audit/design-manual/scripts/capture-task.ts`** — imports `RecordShotRequest` and `StitchRequest` types; the Node-side tasks consume the pieces and metadata this file produces to stitch tiles and record the final manifest entry.
- **`scripts/audit/design-manual/scripts/bands.ts`** — imports `bandsOf` (which fixed elements are horizontal bands that should appear in every piece), `stepsFor` (scroll-step calculation), and the `FixedBox` type.
- **`scripts/audit/design-manual/scripts/capture-matrix.ts`** — imports `moduleOfSpec` to resolve the spec file's module path for the manifest.
- **`tests/support/e2e/e2e.ts`** — the shared e2e support entry point that loads this file, making the `captureDesign` command available to all specs.
- **`src/modules/locales/tests/languages-list-actions.spec.ts`** — a graph-neighbor spec whose captured page exercises this file's command.
- **`src/modules/tasks/views/TaskDetail.vue`** — a graph-neighbor component whose rendered state is a capture target produced through this file.

## Notes

- The command **never asserts on visual design**; only a dimension mismatch (a clamped/cropped piece) causes a test failure.
- Fixed elements are hidden after the first piece via an injected `<style>` tag scoped by `data-design-capture-fixed`; bands (per `bandsOf`) are exempt and persist across all pieces.
- Sticky elements that have their own scroll ancestor do **not** repeat across pieces; only document-level sticky elements do.
- A non-fullscreen overlay (menu, drawer) blocks document scroll, resulting in a single-piece shot.
- The `/// <reference types="cypress" />` triple-slash directive is required so the global `Cypress.Chainable` augmentation is visible without a separate import.
- The `describeElement` output is a *reporting* string, not a `querySelector` — it is stored in the manifest for human/AI reference.
