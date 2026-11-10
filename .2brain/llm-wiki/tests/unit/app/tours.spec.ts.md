---
source: tests/unit/app/tours.spec.ts
sha256: 40d503163aeb85660442142105152f73c2469a29e8060370433c67653c4b3d26
signature: e153bba08773991f6fd14a64acca970e5630e1b3aa83cd7ddf67da9d95d3a47c
generated_at: 2026-11-10T07:51:30.022429+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/tours.spec.ts

## Purpose

Unit and integration tests for the guided-tour subsystem. It verifies the pure step-assembly helpers (filtering by tour name, ordering, dropping absent anchors), guarantees that every tour the build contributes is known to the catalogue and has i18n copy in both English and Italian, and exercises `useTour` driving a real driver.js popover in jsdom (open, record-as-seen, focus restoration, accessibility).

## Key elements

- **`step(tour, id, order?)`** – tiny factory that builds an `AppTourStep` with placeholder copy, used across catalogue tests.
- **`lookup(dictionary, key)`** – walks a dotted key (`a.b.c`) through a nested object; returns `undefined` if any segment is missing. Used to validate i18n copy existence.
- **`Page`** – a `defineComponent` fixture rendering two visible `[data-tour]` anchors (`nav-main`, `user-menu`) and one hidden anchor (`admin-menu`, `display: none`), giving `useTour` a realistic DOM to work against.
- **`closeWithEscape()`** – dispatches a `keyup` Escape on `document` and `vi.waitFor`s the `.driver-popover` to disappear.
- **`mountTour()`** – mounts a host component whose `setup` calls `useTour()`, attaches to `document.body`, and registers the `i18n` plugin.
- **`describe('stepsOfTour')`** – asserts filtering to the named tour and stable ordering (ordered steps first, unordered last).
- **`describe('visibleSteps')`** – asserts steps whose anchor is not on screen are dropped.
- **`describe('what the build contributes')`** – iterates `collectModuleTours(enabledModules)` to confirm every tour id exists in `TOURS`, every `title`/`body` key resolves to a string in both `en` and `it` dictionaries (shell + module locales), shell key parity between the two locale JSON files, and that only `welcome` is marked `auto`.
- **`describe('isAnchorVisible')`** – true/false for present/absent anchors in the mounted page.
- **`describe('useTour')`** – end-to-end: opens the welcome tour, checks popover DOM, `hasSeen`/`hasSeenTour` persistence, runs `axeViolations`, closes via Escape and asserts focus returns to the trigger; also verifies an unknown tour id resolves `false`.

## Relationships

- **`tests/support/unit/axe.ts`** – imports `axeViolations` to run an axe-core audit against the live driver.js popover DOM, asserting zero accessibility violations while a tour step is displayed.

## Notes

- `closeWithEscape` dispatches the `KeyboardEvent` on **`document`**, not on the popover element, because driver.js attaches its Escape listener at the document level.
- `mountTour` uses `attachTo: document.body`; the `afterEach` hook resets `document.body.innerHTML = ''` to prevent cross-test DOM leakage.
- `beforeEach` clears `localStorage` key `'toursSeen'` and creates a fresh Pinia instance so the "seen" state is isolated per test.
- The i18n copy check for module steps dynamically resolves each module's locale function (`locales[locale]()`) and merges results with the shell dictionary before asserting key existence—new modules must contribute their own locale bundles or the test fails.
- The `lookup` helper treats any non-object intermediate as `undefined`, so a key pointing to a non-string (e.g. a nested object) will **not** satisfy the `typeof … === 'string'` assertion; copy values must be leaf strings.
