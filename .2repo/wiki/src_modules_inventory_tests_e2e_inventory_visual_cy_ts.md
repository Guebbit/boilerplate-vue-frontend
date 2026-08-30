# src/modules/inventory/tests/e2e/inventory.visual.cy.ts

## Purpose

Registers the inventory module's screen with the visual-regression sweep so that a pixel-level baseline is captured and compared on every run. The file acts as a declarative "screen list": all sweep mechanics live in the shared support utility, and this file simply declares *which* route, *when* it is ready, and *as which role* to photograph.

## Key elements

- **`sweepVisual('inventory', …, 'admin')`** — the single call in this file. It tells the sweep engine to:
  - label the module `inventory`,
  - capture the screen `inventory-ledger` at route `/en/inventory`,
  - wait for the selector `[data-test=level-row]` (a board row) before taking the snapshot,
  - authenticate as the `admin` role.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper that this file imports. All Cucumber/cypress orchestration, viewport iteration, and snapshot comparison logic lives there; this file contributes only the screen definition.

## Notes

- **Co-located baselines.** PNG snapshots live in `__snapshots__/` beside this file, inside the inventory module. Deleting the module deletes its baselines automatically, avoiding orphaned images of a screen the app no longer serves.
- **Ready selector is intentional.** `[data-test=level-row]` (a board row) is used instead of a page-shell selector so the baseline captures a *rendered* state rather than a stable, meaningless loading skeleton.
- **Excluded from `npm run complete`.** Run explicitly with `npm run test:e2e:visual`. Re-record with `npm run test:e2e:visual:update` only after visually inspecting the diff; re-recording blindly defeats the purpose of the suite.
