# src/modules/account/tests/e2e/account.visual.cy.ts

## Purpose

Declarative screen list that tells the shared visual-regression sweep which routes and anchors to snapshot for the account module. It contains no test logic of its own — the mechanism lives in the shared `visual-sweep` utility.

## Key elements

- **`sweepVisual('account', [['login', '/en/login', '#login-page']])`** — Registers one screen (`login`) at route `/en/login`, anchored to `#login-page`. This is the sole runtime call in the file; everything else is documentation.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function actually imported and called here. That file owns the navigation, waiting, and screenshotting logic; this file only supplies the screen definitions.

## Notes

- **Snapshot placement:** Baselines are stored in `__snapshots__/` *beside* this file (co-located with the module), so deleting the module also deletes its PNGs. There is no central snapshot folder.
- **Not in `npm run complete`:** Run explicitly via `npm run test:e2e:visual`.
- **Re-recording rule (from the file's own docs):** Use `npm run test:e2e:visual:update` only after visually inspecting the diff. Blind re-recordation is flagged as the one thing that invalidates the suite.
- **Adding a screen** means appending another `[name, route, anchor]` tuple to the `sweepVisual` call — no other wiring required.
