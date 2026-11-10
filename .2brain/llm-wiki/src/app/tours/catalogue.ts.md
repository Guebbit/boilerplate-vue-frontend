---
source: src/app/tours/catalogue.ts
sha256: 72b97f3096563624dfb947a05fadb2754e808c6eb26e55d3118c94d71f040e44
signature: 95a2efaac60b85295c43f264e5a12dbea8b3886b25d5e60aecc5f44cb1402660
generated_at: 2026-11-10T02:57:16.545154+00:00
model: ollama:qwen3.8:27b
---

# src/app/tours/catalogue.ts

## Purpose

Pure-function catalogue that defines which guided tours this build supports, their version/auto-open metadata, and the step ordering and visibility rules the shell applies before handing steps to the DOM-driving layer (`use-tour.ts`). It exists so that tour registration, filtering, and ordering live in one importable, side-effect-free module.

## Key elements

- **`WELCOME_TOUR_ID`** – Constant (`'welcome'`) identifying the tour that auto-opens after first sign-in.
- **`TourDefinition`** – Interface with `version: number` (bumping re-triggers the tour for all users) and optional `auto: boolean`.
- **`TOURS`** – `Record<string, TourDefinition>` sourced directly from `TOUR_DATA`; the single source of truth for "which tours exist in this build."
- **`isKnownTour(tourId)`** – Returns whether a (typically URL-supplied) id is a registered tour; unknown ids are silently ignored.
- **`SHELL_STEPS`** (module-private) – The five `AppTourStep` entries for the app-bar anchors (`nav-main`, `menu-toggle`, `admin-menu`, `cart`, `user-menu`) that the welcome tour highlights.
- **`ALL_STEPS`** (module-private) – `SHELL_STEPS` concatenated with `collectModuleTours(enabledModules)` from the kernel registry.
- **`tourSelector(target)`** – Builds the CSS attribute selector `[data-tour="<target>"]` used to locate an anchor.
- **`stepsOfTour(tourId, steps?)`** – Filters `steps` (default `ALL_STEPS`) to one tour, then sorts by `order` (missing order sorts last).
- **`visibleSteps(steps, isVisible)`** – Filters steps whose `data-tour` anchor is currently present and visible; the primary mechanism for role- and viewport-based step dropping.

## Relationships

- **`src/app/tours/tours.generated.ts`** – Supplies `TOUR_DATA`, which is assigned to the exported `TOURS` constant. The generated file is the single input that determines the catalogue's shape; this file adds no tour ids of its own (beyond the shell steps that are keyed to `WELCOME_TOUR_ID`).

## Notes

- The module is deliberately side-effect-free: no DOM reads, no `driver.js` calls. `use-tour.ts` is the sole consumer that touches the DOM.
- Role-based visibility is handled *implicitly*: a step is dropped only if its `data-tour` element is not rendered (e.g., admin menu hidden for non-admins, cart hidden in a cart-less build). There is no explicit role check in this file.
- `SHELL_STEPS` and `ALL_STEPS` are intentionally **not** exported; consumers should go through `stepsOfTour` / `visibleSteps`.
- `stepsOfTour` uses `Array.prototype.toSorted` (ES 2023); the runtime must support it or a polyfill must be present.
- The `order` values in `SHELL_STEPS` (10, 10, 20, 30, 90) leave gaps so module steps can interleave without renumbering the shell steps.
